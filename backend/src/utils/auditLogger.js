const AuditLog = require('../models/AuditLog');

const logAudit = async (actorId, action, entityType, entityId) => {
  try {
    await AuditLog.create({
      actor: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId
    });
  } catch (error) {
    console.error('Error logging audit action:', error.message);
  }
};

module.exports = { logAudit };
