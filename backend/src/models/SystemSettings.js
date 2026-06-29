const mongoose = require('mongoose');

const SystemSettingsSchema = new mongoose.Schema({
  storeName: {
    type: String,
    default: 'Shager Wedding Store'
  },
  storeLogo: {
    type: String,
    default: ''
  },
  contactEmail: {
    type: String,
    default: 'info@shagerwedding.com'
  },
  contactPhone: {
    type: String,
    default: '+251 911 000000'
  },
  physicalAddress: {
    type: String,
    default: 'Addis Ababa, Ethiopia'
  },
  notificationSettings: {
    emailOnNewRequest: { type: Boolean, default: true },
    emailOnAssignment: { type: Boolean, default: true },
    inAppOnStatusChange: { type: Boolean, default: true }
  },
  workingHours: {
    start: { type: String, default: '09:00' },
    end: { type: String, default: '18:00' }
  },
  blackoutDates: {
    type: [Date],
    default: []
  },
  currency: {
    type: String,
    default: 'ETB'
  },
  allowSelfRegistration: {
    type: Boolean,
    default: true
  },
  smtpSettings: {
    host: { type: String, default: 'smtp.mailtrap.io' },
    port: { type: Number, default: 2525 },
    user: { type: String, default: 'mock-user' },
    pass: { type: String, default: 'mock-pass' }
  },
  maxServicesInCart: {
    type: Number,
    default: 10
  }
}, {
  timestamps: true
});

// Helper static to fetch settings (creates if not existing)
SystemSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('SystemSettings', SystemSettingsSchema);
