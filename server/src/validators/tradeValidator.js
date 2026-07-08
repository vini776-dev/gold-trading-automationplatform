const validateCreateTrade = (req, res, next) => {
  const { mt5Ticket, symbol, orderType, lotSize, entryPrice, openTime } = req.body;

  if (!mt5Ticket || !symbol || !orderType || !lotSize || !entryPrice || !openTime) {
    return res.status(400).json({
      success: false,
      status: 'ERROR',
      message: 'All fields (mt5Ticket, symbol, orderType, lotSize, entryPrice, openTime) are required',
    });
  }

  if (symbol !== 'XAUUSD') {
    return res.status(400).json({
      success: false,
      status: 'ERROR',
      message: 'Only XAUUSD trading is supported',
    });
  }

  if (orderType !== 'BUY' && orderType !== 'SELL') {
    return res.status(400).json({
      success: false,
      status: 'ERROR',
      message: 'orderType must be BUY or SELL',
    });
  }

  if (typeof lotSize !== 'number' || lotSize <= 0) {
    return res.status(400).json({
      success: false,
      status: 'ERROR',
      message: 'lotSize must be a positive number',
    });
  }

  next();
};

const validateCloseTrade = (req, res, next) => {
  const { exitPrice, closeTime, closeReason } = req.body;

  if (!exitPrice || !closeTime || !closeReason) {
    return res.status(400).json({
      success: false,
      status: 'ERROR',
      message: 'exitPrice, closeTime, and closeReason are required',
    });
  }

  next();
};

module.exports = {
  validateCreateTrade,
  validateCloseTrade,
};
