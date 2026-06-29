const Cart = require('../models/Cart');
const Service = require('../models/Service');
const SystemSettings = require('../models/SystemSettings');

// Helper to get or create cart
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

// @desc    Get current user's cart
// @route   GET /api/cart
// @access  Private (Customer)
exports.getCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    await cart.populate({
      path: 'items.service',
      populate: { path: 'category', select: 'name' }
    });

    res.status(200).json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add service to cart
// @route   POST /api/cart
// @access  Private (Customer)
exports.addToCart = async (req, res) => {
  try {
    const { serviceId, customNotes } = req.body;
    
    // Check if service exists and is active
    const service = await Service.findById(serviceId);
    if (!service || !service.is_active) {
      return res.status(404).json({ success: false, message: 'Active service not found' });
    }

    const settings = await SystemSettings.getSettings();
    const cart = await getOrCreateCart(req.user.id);

    // Check maximum services allowed in cart
    if (cart.items.length >= settings.maxServicesInCart) {
      return res.status(400).json({
        success: false,
        message: `Cart checkout limit reached! Maximum services allowed: ${settings.maxServicesInCart}`
      });
    }

    // Check if item already exists
    const existingIndex = cart.items.findIndex(item => item.service.toString() === serviceId);
    if (existingIndex > -1) {
      // Overwrite custom notes
      cart.items[existingIndex].custom_notes = customNotes || cart.items[existingIndex].custom_notes;
    } else {
      cart.items.push({
        service: serviceId,
        custom_notes: customNotes || ''
      });
    }

    await cart.save();
    res.status(200).json({ success: true, message: 'Added to cart successfully', cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:itemId
// @access  Private (Customer)
exports.removeFromCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    cart.items = cart.items.filter(item => item._id.toString() !== req.params.itemId);
    await cart.save();

    res.status(200).json({ success: true, message: 'Removed from cart successfully', cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear entire cart
// @route   DELETE /api/cart
// @access  Private (Customer)
exports.clearCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    cart.items = [];
    await cart.save();

    res.status(200).json({ success: true, message: 'Cart cleared successfully', cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
