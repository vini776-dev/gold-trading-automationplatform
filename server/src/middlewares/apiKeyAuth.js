const User = require('../models/User');
const { updateEngineHeartbeat } = require('../config/socket');

const apiKeyAuth = async (req, res, next) => {
  const apiKey = req.headers['x-internal-api-key'];

  if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
    return res.status(401).json({
      success: false,
      status: 'ERROR',
      code: 'AUTH_UNAUTHORIZED',
      message: 'Unauthorized: Invalid internal API key',
    });
  }

  // Bind the default admin user for internal trading engine tasks
  try {
    const admin = await User.findOne({ role: 'Admin' });
    if (admin) {
      req.user = admin;
    }
    
    // Register heartbeat from the Python Trading Engine
    updateEngineHeartbeat();
    
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      status: 'ERROR',
      code: 'SERVER_ERROR',
      message: error.message,
    });
  }
};

module.exports = {
  apiKeyAuth,
};
