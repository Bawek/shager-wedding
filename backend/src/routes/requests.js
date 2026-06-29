const express = require('express');
const {
  submitRequest,
  getMyRequests,
  cancelRequest,
  getInbox,
  getRequestDetails,
  addInternalNote,
  rejectRequest,
  assignTask,
  completeRequest,
  getTeamWorkload,
  getMyTasks,
  updateTaskStatus,
  addTaskNote,
  uploadDeliverable,
  escalateTask
} = require('../controllers/requestsController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const router = express.Router();

router.use(protect);

// Customer specific
router.post('/', authorize('customer'), submitRequest);
router.get('/my-requests', authorize('customer'), getMyRequests);
router.put('/:id/cancel', authorize('customer'), cancelRequest);

// Manager / Admin specific
router.get('/inbox', authorize('manager', 'admin'), getInbox);
router.get('/team-workload', authorize('manager', 'admin'), getTeamWorkload);
router.post('/:id/notes', authorize('manager', 'admin'), addInternalNote);
router.post('/:id/reject', authorize('manager', 'admin'), rejectRequest);
router.post('/:id/assign', authorize('manager', 'admin'), assignTask);
router.put('/:id/complete', authorize('manager', 'admin'), completeRequest);

// Team Member specific
router.get('/my-tasks', authorize('team'), getMyTasks);
router.put('/:id/tasks/:assignId/status', authorize('team'), updateTaskStatus);
router.post('/:id/tasks/:assignId/notes', authorize('team'), addTaskNote);
router.post('/:id/tasks/:assignId/deliverables', authorize('team'), uploadDeliverable);
router.post('/:id/tasks/:assignId/escalate', authorize('team'), escalateTask);

// Shared details route (internal role checks handled inside controller)
router.get('/:id', getRequestDetails);

module.exports = router;
