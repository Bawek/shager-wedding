const express = require('express');
const {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  resetUserPassword,
  createService,
  updateService,
  createCategory,
  updateCategory,
  getSettings,
  updateSettings,
  getAnalytics,
  exportCSV,
  getAuditLogs
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { uploadServiceFiles, uploadProfileImage } = require('../utils/cloudinary');

const router = express.Router();

router.use(protect);

// Allow Managers access to analytics and CSV exports, restrict everything else to Admin only
router.get('/analytics', authorize('admin', 'manager'), getAnalytics);
router.get('/export-csv', authorize('admin', 'manager'), exportCSV);

// Restrict all other routes below to Admin only
router.use(authorize('admin'));

// User Management
router.route('/users')
  .get(getUsers)
  .post(createUser);

router.route('/users/:id')
  .put(uploadProfileImage, updateUser)
  .delete(deleteUser);

router.post('/users/:id/reset-password', resetUserPassword);

// Service Management
router.post('/services', uploadServiceFiles, createService);
router.put('/services/:id', uploadServiceFiles, updateService);

// Category Management
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);

// Settings configurations
router.route('/settings')
  .get(getSettings)
  .put(updateSettings);

// Audit logs
router.get('/audit-logs', getAuditLogs);

module.exports = router;
