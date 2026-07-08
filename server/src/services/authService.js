const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TradeLog = require('../models/TradeLog');

const loginUser = async (email, password) => {
  // Find user and explicitly select password, loginAttempts, and lockUntil fields
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check if account is temporarily locked
  if (user.lockUntil && user.lockUntil > Date.now()) {
    const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 1000);
    throw new Error(`Account is locked. Try again in ${remainingTime} seconds.`);
  }

  // Verify password
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    // Increment login attempts
    user.loginAttempts += 1;

    // Lock account for 1 minute if attempts reach 5
    if (user.loginAttempts >= 5) {
      user.lockUntil = Date.now() + 60000; // 1 minute lock
      await user.save();
      throw new Error('Too many failed attempts. Account locked for 1 minute.');
    }

    await user.save();
    throw new Error('Invalid email or password');
  }

  // Reset login attempts on successful login
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLogin = new Date();
  await user.save();

  // Generate JWT Token
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Log successful login event
  await TradeLog.create({
    userId: user._id,
    logType: 'AUTH',
    message: `User ${user.fullName} logged in successfully`,
    level: 'info',
  });

  // Remove password from returned user object
  user.password = undefined;

  return { user, token };
};

const logoutUser = async (userId, userFullName) => {
  // Log successful logout event
  await TradeLog.create({
    userId,
    logType: 'AUTH',
    message: `User ${userFullName} logged out successfully`,
    level: 'info',
  });
};

module.exports = {
  loginUser,
  logoutUser,
};
