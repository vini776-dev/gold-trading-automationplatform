const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { COOKIE_NAME } = require('../config/cookieConfig');

const protect = async (req, res, next) => {
  let token;

  // Read token from HTTP-only cookies
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    token = req.cookies[COOKIE_NAME];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      status: 'ERROR',
      code: 'AUTH_UNAUTHORIZED',
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
        code: 'AUTH_UNAUTHORIZED',
        message: 'Not authorized, user not found',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        status: 'ERROR',
        code: 'AUTH_UNAUTHORIZED',
        message: 'Not authorized, user account is inactive',
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    let errorCode = 'AUTH_TOKEN_INVALID';
    let errorMessage = 'Not authorized, token invalid';

    if (error.name === 'TokenExpiredError') {
      errorCode = 'AUTH_TOKEN_EXPIRED';
      errorMessage = 'Not authorized, token expired';
    }

    return res.status(401).json({
      success: false,
      status: 'ERROR',
      code: errorCode,
      message: errorMessage,
    });
  }
};

module.exports = {
  protect,
};
