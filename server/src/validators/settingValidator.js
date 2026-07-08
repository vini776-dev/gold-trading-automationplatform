const validateUpdateSettings = (req, res, next) => {
  const { lotSize, maxTrades, emaPeriod, rsiPeriod, fractalPeriod } = req.body;

  if (lotSize !== undefined && (typeof lotSize !== 'number' || lotSize <= 0)) {
    return res.status(400).json({
      success: false,
      status: 'ERROR',
      message: 'lotSize must be a positive number',
    });
  }

  if (maxTrades !== undefined && (!Number.isInteger(maxTrades) || maxTrades <= 0 || maxTrades > 10)) {
    return res.status(400).json({
      success: false,
      status: 'ERROR',
      message: 'maxTrades must be an integer between 1 and 10',
    });
  }

  if (emaPeriod !== undefined && (!Number.isInteger(emaPeriod) || emaPeriod <= 0)) {
    return res.status(400).json({
      success: false,
      status: 'ERROR',
      message: 'emaPeriod must be a positive integer',
    });
  }

  if (rsiPeriod !== undefined && (!Number.isInteger(rsiPeriod) || rsiPeriod <= 0)) {
    return res.status(400).json({
      success: false,
      status: 'ERROR',
      message: 'rsiPeriod must be a positive integer',
    });
  }

  if (fractalPeriod !== undefined && (!Number.isInteger(fractalPeriod) || fractalPeriod < 3)) {
    return res.status(400).json({
      success: false,
      status: 'ERROR',
      message: 'fractalPeriod must be an integer greater than or equal to 3',
    });
  }

  next();
};

module.exports = {
  validateUpdateSettings,
};
