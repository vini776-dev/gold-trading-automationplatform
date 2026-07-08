const tradeService = require('../services/tradeService');

const handleCreateTrade = async (req, res) => {
  try {
    const { trade, created } = await tradeService.createTrade(req.user._id, req.body);
    const status = created ? 21 : 20; // 21 Created or 20 OK (for idempotency)
    return res.status(status).json({
      success: true,
      message: created ? 'Trade registered successfully' : 'Trade already registered',
      data: trade,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      status: 'ERROR',
      code: 'TRADE_CREATION_FAILED',
      message: error.message,
    });
  }
};

const handleCloseTrade = async (req, res) => {
  try {
    const trade = await tradeService.closeTrade(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Trade closed successfully',
      data: trade,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      status: 'ERROR',
      code: 'TRADE_CLOSURE_FAILED',
      message: error.message,
    });
  }
};

const handleGetActiveTrades = async (req, res) => {
  try {
    const trades = await tradeService.getActiveTrades(req.user._id);
    return res.status(200).json({
      success: true,
      data: trades,
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

const handleGetTradeHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await tradeService.getTradeHistory(req.user._id, page, limit);

    return res.status(200).json({
      success: true,
      ...result,
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
  handleCreateTrade,
  handleCloseTrade,
  handleGetActiveTrades,
  handleGetTradeHistory,
};
