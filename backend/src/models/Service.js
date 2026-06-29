const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a service name'],
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceCategory',
    required: true
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  price_min: {
    type: Number,
    required: [true, 'Please add a minimum price']
  },
  price_max: {
    type: Number,
    required: [true, 'Please add a maximum price']
  },
  thumbnail: {
    type: String
  },
  images: {
    type: [String],
    default: []
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Service', ServiceSchema);
