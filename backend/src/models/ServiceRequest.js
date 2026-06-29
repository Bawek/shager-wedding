const mongoose = require('mongoose');

const RequestItemSchema = new mongoose.Schema({
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  custom_notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ESCALATED'],
    default: 'PENDING'
  }
});

const AssignmentSchema = new mongoose.Schema({
  request_item_id: {
    type: mongoose.Schema.Types.ObjectId, // refers to a RequestItem id in the items list
    required: true
  },
  team_member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assigned_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deadline: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ESCALATED'],
    default: 'PENDING'
  },
  manager_notes: {
    type: String,
    default: ''
  },
  deliverables: [
    {
      filename: String,
      url: String,
      uploaded_at: {
        type: Date,
        default: Date.now
      }
    }
  ],
  progress_notes: [
    {
      note: String,
      created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }
  ]
});

const InternalNoteSchema = new mongoose.Schema({
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  note: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const AuditLogEntrySchema = new mongoose.Schema({
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const ServiceRequestSchema = new mongoose.Schema({
  reference_no: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true // customer
  },
  event_date: {
    type: Date,
    required: [true, 'Please specify the event date']
  },
  venue: {
    type: String,
    required: [true, 'Please specify the event venue']
  },
  status: {
    type: String,
    enum: ['PENDING', 'REVIEWED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'ESCALATED'],
    default: 'PENDING'
  },
  customer_message: {
    type: String,
    default: ''
  },
  rejection_reason: {
    type: String,
    default: ''
  },
  items: [RequestItemSchema],
  assignments: [AssignmentSchema],
  internal_notes: [InternalNoteSchema],
  activity_log: [AuditLogEntrySchema]
}, {
  timestamps: { createdAt: 'submitted_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('ServiceRequest', ServiceRequestSchema);
