const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      status: 'ERROR',
      message: 'Email and password are required',
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      status: 'ERROR',
      message: 'Invalid email format',
    });
  }

  next();
};

module.exports = {
  validateLogin,
};
