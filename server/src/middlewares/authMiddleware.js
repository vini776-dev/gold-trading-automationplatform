const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Read token from HTTP-only cookies
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      status: 'ERROR',
      message: 'Not authorized, token missing',
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user and ensure they exist and are active
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        status: 'ERROR',
        message: 'Not authorized, user not found',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        status: 'ERROR',
        message: 'Not authorized, user account is inactive',
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      status: 'ERROR',
      message: 'Not authorized, token invalid or expired',
    });
  }
};

module.exports = {
  protect,
};
