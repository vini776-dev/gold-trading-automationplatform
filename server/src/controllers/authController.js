const authService = require('../services/authService');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.loginUser(email, password);

    // Set secure cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

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
    const status = error.message.includes('locked') ? 423 : 401; // 423 Locked or 401 Unauthorized
    return res.status(status).json({
      success: false,
      status: 'ERROR',
      message: error.message,
    });
  }
};

const logout = async (req, res) => {
  try {
    const userId = req.user._id;
    const userFullName = req.user.fullName;

    await authService.logoutUser(userId, userFullName);

    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
    });

    return res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      status: 'ERROR',
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
      message: error.message,
    });
  }
};

module.exports = {
  login,
  logout,
  verify,
};
