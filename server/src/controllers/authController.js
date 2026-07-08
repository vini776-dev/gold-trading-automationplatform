const authService = require('../services/authService');
const { COOKIE_NAME, getCookieOptions, getSessionCookieOptions } = require('../config/cookieConfig');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.loginUser(email, password);

    // Set secure cookie using standard config helper
    res.cookie(COOKIE_NAME, token, getSessionCookieOptions());

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    const status = error.code === 'AUTH_ACCOUNT_LOCKED' ? 423 : 401; // 423 Locked or 401 Unauthorized
    return res.status(status).json({
      success: false,
      status: 'ERROR',
      code: error.code || 'AUTH_INVALID_CREDENTIALS',
      message: error.message,
    });
  }
};

const logout = async (req, res) => {
  try {
    const userId = req.user._id;
    const userFullName = req.user.fullName;

    await authService.logoutUser(userId, userFullName);

    // Clear cookie using standard config helper
    res.clearCookie(COOKIE_NAME, getCookieOptions());

    return res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      status: 'ERROR',
      code: 'SERVER_ERROR',
      message: error.message,
    });
  }
};

const verify = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        id: req.user._id,
        fullName: req.user.fullName,
        email: req.user.email,
        role: req.user.role,
      },
    });
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
  login,
  logout,
  verify,
};
