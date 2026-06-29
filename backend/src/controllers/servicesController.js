const Service = require('../models/Service');
const ServiceCategory = require('../models/ServiceCategory');

// @desc    Get all categories
// @route   GET /api/services/categories
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const categories = await ServiceCategory.find().sort('sort_order');
    res.status(200).json({ success: true, count: categories.length, categories });
  } catch (error) {
    res.status(500).json({ success: true, message: error.message });
  }
};

// @desc    Get all services (with filters)
// @route   GET /api/services
// @access  Public
exports.getServices = async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice } = req.query;
    
    // Default filter for active services
    const query = { is_active: true };

    // Apply category filter
    if (category) {
      query.category = category;
    }

    // Apply search filter (name/description)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Apply price range filters
    if (minPrice || maxPrice) {
      query.price_min = {};
      if (minPrice) query.price_min.$gte = Number(minPrice);
      if (maxPrice) query.price_min.$lte = Number(maxPrice);
    }

    const services = await Service.find(query).populate('category', 'name icon');
    res.status(200).json({ success: true, count: services.length, services });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single service details
// @route   GET /api/services/:id
// @access  Public
exports.getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate('category', 'name icon');
    
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    // Include dummy ratings / reviews
    const serviceWithRatings = {
      ...service.toObject(),
      rating: 4.8,
      reviews: [
        { id: 1, user: 'Martha K.', rating: 5, comment: 'Exceptional decoration! Understood exactly what we wanted.' },
        { id: 2, user: 'Amanuel T.', rating: 4, comment: 'Very professional, delivery was prompt.' }
      ]
    };

    res.status(200).json({ success: true, service: serviceWithRatings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
