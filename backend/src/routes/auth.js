const express = require('express');
const { register, login, getMe, logout, resetPasswordLink, resetPasswordConfirm, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { uploadProfileImage } = require('../utils/cloudinary');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/reset-password', resetPasswordLink);
router.post('/reset-password/confirm', resetPasswordConfirm);
router.put('/profile', protect, uploadProfileImage, updateProfile);

module.exports = router;
