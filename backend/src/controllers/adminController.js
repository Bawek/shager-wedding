const User = require('../models/User');
const Service = require('../models/Service');
const ServiceCategory = require('../models/ServiceCategory');
const ServiceRequest = require('../models/ServiceRequest');
const SystemSettings = require('../models/SystemSettings');
const AuditLog = require('../models/AuditLog');
const { logAudit } = require('../utils/auditLogger');
const bcrypt = require('bcryptjs');
const { uploadToCloudinary, deleteFromCloudinary, getPublicIdFromUrl } = require('../utils/cloudinary');

// ==========================================
// USER MANAGEMENT
// ==========================================

// @desc    Create a new user account
// @route   POST /api/admin/users
// @access  Private (Admin)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const userData = {
      name,
      email,
      password,
      phone,
      role: role || 'customer'
    };

    if (req.file) {
      try {
        const uploaded = await uploadToCloudinary(req.file, 'profiles');
        userData.profile = { image: uploaded.url };
      } catch (uploadError) {
        console.error('Error uploading profile image:', uploadError);
        return res.status(500).json({ success: false, message: 'Error uploading profile image' });
      }
    }

    const user = await User.create(userData);

    await logAudit(req.user.id, `Created user account for ${email} (${role})`, 'User', user._id);

    res.status(201).json({ success: true, message: 'User account created successfully', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all registered users (with filters)
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getUsers = async (req, res) => {
  try {
    const { role, status } = req.query;
    const query = {};

    if (role) query.role = role;
    if (status) query.status = status;

    const users = await User.find(query).sort('-created_at');
    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user profile or role
// @route   PUT /api/admin/users/:id
// @access  Private (Admin)
exports.updateUser = async (req, res) => {
  try {
    const { name, phone, role, status } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.role = role || user.role;
    user.status = status || user.status;

    // Handle profile image upload
    if (req.file) {
      try {
        const uploaded = await uploadToCloudinary(req.file, 'profiles');
        if (!user.profile) {
          user.profile = {};
        }
        user.profile.image = uploaded.url;
      } catch (uploadError) {
        console.error('Error uploading profile image:', uploadError);
        return res.status(500).json({ success: false, message: 'Error uploading profile image' });
      }
    }

    await user.save();

    await logAudit(
      req.user.id,
      `Updated user profile/role for ${user.email}`,
      'User',
      user._id
    );

    res.status(200).json({ success: true, message: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Permanently delete or deactivate user account
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Don't delete yourself
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own admin account' });
    }

    await User.findByIdAndDelete(req.params.id);

    await logAudit(req.user.id, `Permanently deleted account ${user.email}`, 'User', user._id);

    res.status(200).json({ success: true, message: 'User account permanently deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset password for any user account
// @route   POST /api/admin/users/:id/reset-password
// @access  Private (Admin)
exports.resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Provide a password of at least 6 characters' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    await logAudit(req.user.id, `Reset password for user ${user.email}`, 'User', user._id);

    res.status(200).json({ success: true, message: `Password for ${user.email} reset successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// SERVICE CATALOG MANAGEMENT
// ==========================================

// @desc    Create new wedding service
// @route   POST /api/admin/services
// @access  Private (Admin)
exports.createService = async (req, res) => {
  try {
    const { name, categoryId, description, priceMin, priceMax, images } = req.body;

    if (!name || !categoryId || !priceMin || !priceMax) {
      return res.status(400).json({ success: false, message: 'Name, Category, and prices are required' });
    }

    // Handle thumbnail upload
    let thumbnailUrl = null;
    if (req.files && req.files.thumbnail && req.files.thumbnail.length > 0) {
      try {
        const uploaded = await uploadToCloudinary(req.files.thumbnail[0], 'services/thumbnails');
        thumbnailUrl = uploaded.url;
      } catch (uploadError) {
        console.error('Error uploading thumbnail:', uploadError);
        return res.status(500).json({ success: false, message: 'Error uploading thumbnail' });
      }
    }

    // Handle image uploads
    let uploadedImages = [];
    if (req.files && req.files.images && req.files.images.length > 0) {
      for (const file of req.files.images) {
        try {
          const uploaded = await uploadToCloudinary(file, 'services');
          uploadedImages.push(uploaded.url);
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
        }
      }
    }

    // Combine uploaded images with any provided image URLs
    const allImages = [...uploadedImages, ...(images || [])];

    const service = await Service.create({
      name,
      category: categoryId,
      description: description || '',
      price_min: Number(priceMin),
      price_max: Number(priceMax),
      thumbnail: thumbnailUrl,
      images: allImages,
      is_active: true
    });

    await logAudit(req.user.id, `Created service '${name}'`, 'Service', service._id);

    res.status(201).json({ success: true, message: 'Service created successfully', service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Edit existing wedding service
// @route   PUT /api/admin/services/:id
// @access  Private (Admin)
exports.updateService = async (req, res) => {
  try {
    const { name, categoryId, description, priceMin, priceMax, images, is_active } = req.body;
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    // Handle thumbnail upload
    if (req.files && req.files.thumbnail && req.files.thumbnail.length > 0) {
      try {
        const uploaded = await uploadToCloudinary(req.files.thumbnail[0], 'services/thumbnails');
        service.thumbnail = uploaded.url;
      } catch (uploadError) {
        console.error('Error uploading thumbnail:', uploadError);
        return res.status(500).json({ success: false, message: 'Error uploading thumbnail' });
      }
    }

    // Handle image uploads
    let uploadedImages = [];
    if (req.files && req.files.images && req.files.images.length > 0) {
      for (const file of req.files.images) {
        try {
          const uploaded = await uploadToCloudinary(file, 'services');
          uploadedImages.push(uploaded.url);
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
        }
      }
    }

    // Combine uploaded images with any provided image URLs, or keep existing if none provided
    let allImages = service.images;
    if (uploadedImages.length > 0 || images) {
      allImages = [...uploadedImages, ...(images || [])];
    }

    service.name = name || service.name;
    service.category = categoryId || service.category;
    service.description = description || service.description;
    service.price_min = priceMin !== undefined ? Number(priceMin) : service.price_min;
    service.price_max = priceMax !== undefined ? Number(priceMax) : service.price_max;
    service.images = allImages;
    service.is_active = is_active !== undefined ? is_active : service.is_active;

    await service.save();

    await logAudit(req.user.id, `Updated service '${service.name}'`, 'Service', service._id);

    res.status(200).json({ success: true, message: 'Service updated successfully', service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new service category
// @route   POST /api/admin/categories
// @access  Private (Admin)
exports.createCategory = async (req, res) => {
  try {
    const { name, icon, sortOrder } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const category = await ServiceCategory.create({
      name,
      icon: icon || 'stars',
      sort_order: sortOrder || 0
    });

    await logAudit(req.user.id, `Created service category '${name}'`, 'ServiceCategory', category._id);

    res.status(201).json({ success: true, message: 'Category created successfully', category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update service category
// @route   PUT /api/admin/categories/:id
// @access  Private (Admin)
exports.updateCategory = async (req, res) => {
  try {
    const { name, icon, sortOrder } = req.body;
    const category = await ServiceCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    category.name = name || category.name;
    category.icon = icon || category.icon;
    category.sort_order = sortOrder !== undefined ? sortOrder : category.sort_order;

    await category.save();

    await logAudit(req.user.id, `Updated service category '${category.name}'`, 'ServiceCategory', category._id);

    res.status(200).json({ success: true, message: 'Category updated successfully', category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// SYSTEM SETTINGS
// ==========================================

// @desc    Get system configurations
// @route   GET /api/admin/settings
// @access  Private (Admin)
exports.getSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    res.status(200).json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update system configurations
// @route   PUT /api/admin/settings
// @access  Private (Admin)
exports.updateSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    
    // Assign fields dynamically
    Object.assign(settings, req.body);
    await settings.save();

    await logAudit(req.user.id, 'Updated system settings configurations', 'SystemSettings', settings._id);

    res.status(200).json({ success: true, message: 'Settings updated successfully', settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// REPORTING & OVERSIGHT
// ==========================================

// @desc    Get Analytics Dashboard Data
// @route   GET /api/admin/analytics
// @access  Private (Admin/Manager)
exports.getAnalytics = async (req, res) => {
  try {
    const totalRequests = await ServiceRequest.countDocuments();
    const completedRequests = await ServiceRequest.countDocuments({ status: 'COMPLETED' });
    const pendingRequests = await ServiceRequest.countDocuments({ status: 'PENDING' });
    const activeRequests = await ServiceRequest.countDocuments({ status: { $in: ['REVIEWED', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED'] } });
    
    const requests = await ServiceRequest.find()
      .populate('items.service', 'price_min price_max');

    // Calculate revenue estimate (sum of all average price tags for requested services)
    let estimatedRevenue = 0;
    requests.forEach(r => {
      if (r.status !== 'REJECTED') {
        r.items.forEach(item => {
          if (item.service) {
            const avgPrice = (item.service.price_min + item.service.price_max) / 2;
            estimatedRevenue += avgPrice;
          }
        });
      }
    });

    // Workload/Tasks completed by team members
    const teamMembers = await User.find({ role: 'team' });
    const teamPerformance = await Promise.all(
      teamMembers.map(async (member) => {
        const completedTasksCount = await ServiceRequest.countDocuments({
          assignments: {
            $elemMatch: {
              team_member: member._id,
              status: 'COMPLETED'
            }
          }
        });

        const activeTasksCount = await ServiceRequest.countDocuments({
          assignments: {
            $elemMatch: {
              team_member: member._id,
              status: { $in: ['PENDING', 'IN_PROGRESS'] }
            }
          }
        });

        return {
          name: member.name,
          completedTasks: completedTasksCount,
          activeTasks: activeTasksCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        totalRequests,
        completedRequests,
        pendingRequests,
        activeRequests,
        completionRate: totalRequests > 0 ? ((completedRequests / totalRequests) * 100).toFixed(1) : 0,
        estimatedRevenue,
        teamPerformance
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export Service Requests in CSV format
// @route   GET /api/admin/export-csv
// @access  Private (Admin/Manager)
exports.exportCSV = async (req, res) => {
  try {
    const requests = await ServiceRequest.find()
      .populate('user', 'name email')
      .sort('-submitted_at');

    let csvContent = 'Reference No,Customer Name,Customer Email,Event Date,Venue,Status,Submitted At\n';
    
    requests.forEach(r => {
      const customerName = r.user ? r.user.name.replace(/,/g, ' ') : 'N/A';
      const customerEmail = r.user ? r.user.email : 'N/A';
      const eventDate = new Date(r.event_date).toLocaleDateString();
      const venue = r.venue.replace(/,/g, ' ');
      const submitted = new Date(r.submitted_at).toLocaleDateString();

      csvContent += `${r.reference_no},${customerName},${customerEmail},${eventDate},${venue},${r.status},${submitted}\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment('wedding_requests_export.csv');
    return res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get full platform audit log
// @route   GET /api/admin/audit-logs
// @access  Private (Admin)
exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('actor', 'name email role')
      .sort('-timestamp')
      .limit(100);

    res.status(200).json({ success: true, count: logs.length, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
