const User = require('../models/User');
const Cart = require('../models/Cart');
const SystemSettings = require('../models/SystemSettings');
const jwt = require('jsonwebtoken');
const { uploadToCloudinary } = require('../utils/cloudinary');

// Generate JWT token and set cookie
const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET || 'supersecretweddingstoretoken123!',
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );

  const options = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        profile: user.profile
      }
    });
};

// @desc    Register a user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, weddingDate, venue } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Check system settings if self registration is allowed
    const settings = await SystemSettings.getSettings();
    if (!settings.allowSelfRegistration) {
      return res.status(403).json({ success: false, message: 'Self-registration is disabled. Please contact an administrator.' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: 'customer',
      profile: {
        weddingDate: weddingDate ? new Date(weddingDate) : undefined,
        venue
      }
    });

    // Automatically create empty cart for customer
    await Cart.create({ user: user._id });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Check for user (include password)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if active
    if (user.status === 'inactive') {
      return res.status(403).json({ success: false, message: 'Your account is deactivated' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Log user out / clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// @desc    Simulate Reset Password via Secure Link
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPasswordLink = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found with this email' });
    }

    console.log(`\n=================== PASSWORD RESET SIMULATION ===================`);
    console.log(`TO: ${email}`);
    console.log(`RESET LINK: http://localhost:3000/reset-password?token=mocktoken_${user._id}`);
    console.log(`=================================================================\n`);

    res.status(200).json({
      success: true,
      message: 'Password reset link sent to your email. Check console log for simulation link.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Confirm password reset using simulated token
// @route   POST /api/auth/reset-password/confirm
// @access  Public
exports.resetPasswordConfirm = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Invalid token or password is too short' });
    }

    if (!token.startsWith('mocktoken_')) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const userId = token.replace('mocktoken_', '');
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found for this token' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update customer profile
// @route   PUT /api/auth/profile
// @access  Private (Customer)
exports.updateProfile = async (req, res) => {
  try {
    const { phone, weddingDate, venue } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.phone = phone || user.phone;
    if (weddingDate) user.profile.weddingDate = new Date(weddingDate);
    if (venue !== undefined) user.profile.venue = venue;

    // Handle profile image upload
    if (req.file) {
      try {
        const uploaded = await uploadToCloudinary(req.file, 'profiles');
        user.profile.image = uploaded.url;
      } catch (uploadError) {
        console.error('Error uploading profile image:', uploadError);
        return res.status(500).json({ success: false, message: 'Error uploading profile image' });
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
