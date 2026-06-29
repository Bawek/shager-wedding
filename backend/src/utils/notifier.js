const Notification = require('../models/Notification');
const User = require('../models/User');

const notifyUser = async (userId, type, message) => {
  try {
    // 1. Create in-app notification
    await Notification.create({
      user: userId,
      type,
      message
    });

    // 2. Simulate email delivery
    const user = await User.findById(userId);
    const emailTo = user ? user.email : 'Unknown User';
    
    console.log(`\n=================== EMAIL SIMULATION ===================`);
    console.log(`TO: ${emailTo}`);
    console.log(`SUBJECT: Shager Wedding Store Alert - ${type}`);
    console.log(`BODY: ${message}`);
    console.log(`=======================================================\n`);

  } catch (error) {
    console.error('Error creating notification:', error.message);
  }
};

module.exports = { notifyUser };
