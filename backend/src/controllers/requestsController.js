const ServiceRequest = require('../models/ServiceRequest');
const Cart = require('../models/Cart');
const User = require('../models/User');
const { notifyUser } = require('../utils/notifier');
const { logAudit } = require('../utils/auditLogger');

// Generate unique reference number (e.g., SWS-1719648937012)
const generateRefNo = () => {
  return `SWS-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
};

// ==========================================
// CUSTOMER ACTIONS
// ==========================================

// @desc    Submit a service request from cart
// @route   POST /api/requests
// @access  Private (Customer)
exports.submitRequest = async (req, res) => {
  try {
    const { eventDate, venue, customerMessage } = req.body;

    if (!eventDate || !venue) {
      return res.status(400).json({ success: false, message: 'Please specify the event date and venue' });
    }

    // Get customer's cart
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Your service cart is empty' });
    }

    // Construct request items
    const items = cart.items.map(item => ({
      service: item.service,
      custom_notes: item.custom_notes,
      status: 'PENDING'
    }));

    const reference_no = generateRefNo();

    // Create Service Request
    const request = await ServiceRequest.create({
      reference_no,
      user: req.user.id,
      event_date: new Date(eventDate),
      venue,
      customer_message: customerMessage || '',
      status: 'PENDING',
      items
    });

    // Clear cart
    cart.items = [];
    await cart.save();

    // Audit Log
    await logAudit(req.user.id, `Submitted request ${reference_no}`, 'ServiceRequest', request._id);

    // Notify Customer
    await notifyUser(
      req.user.id,
      'STATUS_CHANGE',
      `Your service request ${reference_no} has been submitted successfully for event date: ${new Date(eventDate).toLocaleDateString()}. Status: PENDING.`
    );

    // Notify Managers
    const managers = await User.find({ role: 'manager', status: 'active' });
    for (const manager of managers) {
      await notifyUser(
        manager._id,
        'NEW_REQUEST',
        `New service request ${reference_no} submitted by customer ${req.user.name} for ${new Date(eventDate).toLocaleDateString()}.`
      );
    }

    res.status(201).json({ success: true, message: 'Request submitted successfully', request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get customer's past and current requests
// @route   GET /api/requests/my-requests
// @access  Private (Customer)
exports.getMyRequests = async (req, res) => {
  try {
    const requests = await ServiceRequest.find({ user: req.user.id })
      .populate('items.service', 'name description price_min price_max')
      .sort('-submitted_at');

    res.status(200).json({ success: true, count: requests.length, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Cancel a service request
// @route   PUT /api/requests/:id/cancel
// @access  Private (Customer)
exports.cancelRequest = async (req, res) => {
  try {
    const request = await ServiceRequest.findOne({ _id: req.params.id, user: req.user.id });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Check status: Can only cancel if PENDING or REVIEWED
    if (!['PENDING', 'REVIEWED'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a request that is already in '${request.status}' status`
      });
    }

    request.status = 'REJECTED';
    request.rejection_reason = 'Cancelled by customer';
    
    // Log in activity
    request.activity_log.push({
      actor: req.user.id,
      action: 'Cancelled request'
    });

    await request.save();

    await logAudit(req.user.id, `Cancelled request ${request.reference_no}`, 'ServiceRequest', request._id);

    // Notify Customer & Managers
    await notifyUser(req.user.id, 'STATUS_CHANGE', `Your service request ${request.reference_no} has been cancelled.`);
    const managers = await User.find({ role: 'manager', status: 'active' });
    for (const manager of managers) {
      await notifyUser(manager._id, 'STATUS_CHANGE', `Service request ${request.reference_no} has been cancelled by the customer.`);
    }

    res.status(200).json({ success: true, message: 'Request cancelled successfully', request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ==========================================
// MANAGER ACTIONS
// ==========================================

// @desc    Get all incoming requests (Manager Inbox)
// @route   GET /api/requests/inbox
// @access  Private (Manager/Admin)
exports.getInbox = async (req, res) => {
  try {
    // Sort logic: order by submission date and proximity to event date
    const requests = await ServiceRequest.find()
      .populate('user', 'name email phone')
      .populate('items.service', 'name price_min price_max')
      .populate('assignments.team_member', 'name email')
      .sort({ event_date: 1, submitted_at: 1 }); // Closer events first

    res.status(200).json({ success: true, count: requests.length, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get request details (Manager inbox view detail)
// @route   GET /api/requests/:id
// @access  Private (Manager/Admin/Customer)
exports.getRequestDetails = async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id)
      .populate('user', 'name email phone profile')
      .populate('items.service', 'name description price_min price_max')
      .populate('assignments.team_member', 'name email phone')
      .populate('assignments.assigned_by', 'name')
      .populate('internal_notes.manager', 'name')
      .populate('activity_log.actor', 'name role')
      .populate('assignments.progress_notes.created_by', 'name role');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Role safety: customer can only view their own requests
    if (req.user.role === 'customer' && request.user._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this request' });
    }

    res.status(200).json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add internal note to request
// @route   POST /api/requests/:id/notes
// @access  Private (Manager/Admin)
exports.addInternalNote = async (req, res) => {
  try {
    const { note } = req.body;
    if (!note) {
      return res.status(400).json({ success: false, message: 'Please add a note' });
    }

    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    request.internal_notes.push({
      manager: req.user.id,
      note
    });

    request.activity_log.push({
      actor: req.user.id,
      action: 'Added internal note'
    });

    await request.save();
    res.status(200).json({ success: true, message: 'Internal note added', request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reject a request with reason
// @route   POST /api/requests/:id/reject
// @access  Private (Manager/Admin)
exports.rejectRequest = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    request.status = 'REJECTED';
    request.rejection_reason = reason;

    request.activity_log.push({
      actor: req.user.id,
      action: `Rejected request. Reason: ${reason}`
    });

    await request.save();

    await logAudit(req.user.id, `Rejected request ${request.reference_no}`, 'ServiceRequest', request._id);
    
    // Notify Customer
    await notifyUser(
      request.user,
      'STATUS_CHANGE',
      `Your request ${request.reference_no} was declined by the manager. Reason: ${reason}`
    );

    res.status(200).json({ success: true, message: 'Request rejected', request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Assign team member to request items
// @route   POST /api/requests/:id/assign
// @access  Private (Manager/Admin)
exports.assignTask = async (req, res) => {
  try {
    const { requestItemId, teamMemberId, deadline, managerNotes } = req.body;

    if (!requestItemId || !teamMemberId || !deadline) {
      return res.status(400).json({ success: false, message: 'Please specify requestItemId, teamMemberId, and deadline' });
    }

    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Find the item within request items
    const requestItem = request.items.id(requestItemId);
    if (!requestItem) {
      return res.status(404).json({ success: false, message: 'Service item not found in this request' });
    }

    // Check if team member exists and is indeed a team member
    const teamMember = await User.findById(teamMemberId);
    if (!teamMember || teamMember.role !== 'team' || teamMember.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Invalid or inactive team member selected' });
    }

    // Remove existing assignment for this item if it exists
    request.assignments = request.assignments.filter(
      assign => assign.request_item_id.toString() !== requestItemId
    );

    // Create assignment
    request.assignments.push({
      request_item_id: requestItemId,
      service: requestItem.service,
      team_member: teamMemberId,
      assigned_by: req.user.id,
      deadline: new Date(deadline),
      status: 'PENDING',
      manager_notes: managerNotes || ''
    });

    // Update item and request status
    requestItem.status = 'PENDING';
    
    // Transition request status if it was PENDING/REVIEWED to ASSIGNED
    if (['PENDING', 'REVIEWED'].includes(request.status)) {
      request.status = 'ASSIGNED';
    }

    request.activity_log.push({
      actor: req.user.id,
      action: `Assigned item to team member ${teamMember.name}`
    });

    await request.save();

    await logAudit(req.user.id, `Assigned service item in ${request.reference_no} to ${teamMember.name}`, 'ServiceRequest', request._id);

    // Notify Team Member
    await notifyUser(
      teamMemberId,
      'ASSIGNMENT',
      `You have been assigned a new task under request ${request.reference_no}. Deadline: ${new Date(deadline).toLocaleDateString()}`
    );

    res.status(200).json({ success: true, message: 'Task assigned successfully', request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark the entire request as COMPLETED (once verified)
// @route   PUT /api/requests/:id/complete
// @access  Private (Manager/Admin)
exports.completeRequest = async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    request.status = 'COMPLETED';
    
    // Set all request items status to COMPLETED
    request.items.forEach(item => {
      item.status = 'COMPLETED';
    });

    // Set all assignments to COMPLETED
    request.assignments.forEach(assign => {
      assign.status = 'COMPLETED';
    });

    request.activity_log.push({
      actor: req.user.id,
      action: 'Marked service request as COMPLETED'
    });

    await request.save();

    await logAudit(req.user.id, `Completed service request ${request.reference_no}`, 'ServiceRequest', request._id);

    // Notify Customer
    await notifyUser(
      request.user,
      'STATUS_CHANGE',
      `Congratulations! All services for your request ${request.reference_no} have been marked as COMPLETED and delivered.`
    );

    res.status(200).json({ success: true, message: 'Request completed', request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get team members with their current workload stats
// @route   GET /api/requests/team-workload
// @access  Private (Manager/Admin)
exports.getTeamWorkload = async (req, res) => {
  try {
    const teamMembers = await User.find({ role: 'team', status: 'active' });
    
    const workloads = await Promise.all(
      teamMembers.map(async (member) => {
        // Query active requests where member is assigned
        const activeRequestsCount = await ServiceRequest.countDocuments({
          assignments: {
            $elemMatch: {
              team_member: member._id,
              status: { $in: ['PENDING', 'IN_PROGRESS'] }
            }
          }
        });

        return {
          id: member._id,
          name: member.name,
          email: member.email,
          phone: member.phone,
          activeTasks: activeRequestsCount
        };
      })
    );

    res.status(200).json({ success: true, workloads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ==========================================
// TEAM MEMBER ACTIONS
// ==========================================

// @desc    Get team member's assigned tasks
// @route   GET /api/requests/my-tasks
// @access  Private (Team Member)
exports.getMyTasks = async (req, res) => {
  try {
    // Find all service requests containing assignments for this team member
    const requests = await ServiceRequest.find({
      'assignments.team_member': req.user.id
    })
      .populate('user', 'name phone email')
      .populate('items.service', 'name price_min price_max');

    // Extract individual assigned items
    const tasks = [];
    requests.forEach(reqObj => {
      reqObj.assignments.forEach(assign => {
        if (assign.team_member.toString() === req.user.id) {
          const reqItem = reqObj.items.id(assign.request_item_id);
          tasks.push({
            requestId: reqObj._id,
            referenceNo: reqObj.reference_no,
            customerName: reqObj.user.name,
            customerPhone: reqObj.user.phone,
            eventDate: reqObj.event_date,
            venue: reqObj.venue,
            assignmentId: assign._id,
            requestItemId: assign.request_item_id,
            serviceName: reqObj.items.find(i => i._id.toString() === assign.request_item_id.toString())?.service?.name || 'Wedding Service',
            deadline: assign.deadline,
            status: assign.status,
            managerNotes: assign.manager_notes,
            deliverables: assign.deliverables,
            progressNotes: assign.progress_notes
          });
        }
      });
    });

    // Sort by deadline urgency
    tasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    res.status(200).json({ success: true, count: tasks.length, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update task status (Accept -> In Progress -> Completed)
// @route   PUT /api/requests/:id/tasks/:assignId/status
// @access  Private (Team Member)
exports.updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['IN_PROGRESS', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status transition' });
    }

    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const assignment = request.assignments.id(req.params.assignId);
    if (!assignment || assignment.team_member.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized or invalid task assignment' });
    }

    // Apply changes
    assignment.status = status;
    
    // Also update request item status
    const reqItem = request.items.id(assignment.request_item_id);
    if (reqItem) {
      reqItem.status = status;
    }

    // Auto-update request status: if any task goes IN_PROGRESS, request goes IN_PROGRESS
    if (status === 'IN_PROGRESS' && request.status !== 'IN_PROGRESS') {
      request.status = 'IN_PROGRESS';
    }

    request.activity_log.push({
      actor: req.user.id,
      action: `Updated task status to '${status}'`
    });

    await request.save();

    await logAudit(
      req.user.id,
      `Updated task in ${request.reference_no} to status ${status}`,
      'ServiceRequest',
      request._id
    );

    // Notify Managers
    const managers = await User.find({ role: 'manager', status: 'active' });
    for (const manager of managers) {
      await notifyUser(
        manager._id,
        'STATUS_CHANGE',
        `Team member ${req.user.name} marked task under request ${request.reference_no} as ${status}.`
      );
    }

    res.status(200).json({ success: true, message: `Task marked as ${status} successfully`, request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add progress note to task
// @route   POST /api/requests/:id/tasks/:assignId/notes
// @access  Private (Team Member)
exports.addTaskNote = async (req, res) => {
  try {
    const { note } = req.body;
    if (!note) {
      return res.status(400).json({ success: false, message: 'Please write a note' });
    }

    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const assignment = request.assignments.id(req.params.assignId);
    if (!assignment || assignment.team_member.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized or invalid task assignment' });
    }

    assignment.progress_notes.push({
      note,
      created_by: req.user.id
    });

    await request.save();
    res.status(200).json({ success: true, message: 'Progress note added successfully', request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload mock file / deliverable
// @route   POST /api/requests/:id/tasks/:assignId/deliverables
// @access  Private (Team Member)
exports.uploadDeliverable = async (req, res) => {
  try {
    const { filename, url } = req.body;
    if (!filename || !url) {
      return res.status(400).json({ success: false, message: 'Filename and Mock URL required' });
    }

    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const assignment = request.assignments.id(req.params.assignId);
    if (!assignment || assignment.team_member.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized or invalid task assignment' });
    }

    assignment.deliverables.push({ filename, url });

    request.activity_log.push({
      actor: req.user.id,
      action: `Uploaded deliverable: ${filename}`
    });

    await request.save();
    res.status(200).json({ success: true, message: 'Deliverable uploaded successfully', request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Escalate task to manager
// @route   POST /api/requests/:id/tasks/:assignId/escalate
// @access  Private (Team Member)
exports.escalateTask = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Escalation reason required' });
    }

    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const assignment = request.assignments.id(req.params.assignId);
    if (!assignment || assignment.team_member.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized or invalid task assignment' });
    }

    assignment.status = 'ESCALATED';
    
    const reqItem = request.items.id(assignment.request_item_id);
    if (reqItem) {
      reqItem.status = 'ESCALATED';
    }

    // Set request status to ESCALATED
    request.status = 'ESCALATED';

    request.activity_log.push({
      actor: req.user.id,
      action: `Escalated task. Reason: ${reason}`
    });

    await request.save();

    await logAudit(
      req.user.id,
      `Escalated task in request ${request.reference_no}. Reason: ${reason}`,
      'ServiceRequest',
      request._id
    );

    // Notify Managers
    const managers = await User.find({ role: 'manager', status: 'active' });
    for (const manager of managers) {
      await notifyUser(
        manager._id,
        'ESCALATION',
        `CRITICAL: Task under request ${request.reference_no} has been escalated by ${req.user.name}. Reason: ${reason}`
      );
    }

    res.status(200).json({ success: true, message: 'Task escalated to manager successfully', request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
