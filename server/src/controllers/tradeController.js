const tradeService = require('../services/tradeService');
const { emitUserEvent } = require('../config/socket');
const { sendTelegramNotification } = require('../services/telegramService');

const handleCreateTrade = async (req, res) => {
  try {
    const { trade, created } = await tradeService.createTrade(req.user._id, req.body);
    
    if (created) {
      // Emit Socket.IO event to frontend
      emitUserEvent(req.user._id, 'trade_started', trade);

      // Async Send Telegram Notification
      const message = `🚀 [GTAP] TRADE OPENED\nTicket: ${trade.mt5Ticket}\nSymbol: ${trade.symbol}\nType: ${trade.orderType}\nLot: ${trade.lotSize}\nEntry Price: ${trade.entryPrice}\nSL: ${trade.stopLoss} | TP: ${trade.takeProfit}`;
      sendTelegramNotification(message);
    }

    const status = created ? 201 : 200; // 201 Created or 200 OK (for idempotency)
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

    // Emit Socket.IO event to frontend
    emitUserEvent(req.user._id, 'trade_closed', trade);

    // Async Send Telegram Notification
    const sign = trade.profitLoss >= 0 ? '+' : '';
    const message = `✅ [GTAP] TRADE CLOSED\nTicket: ${trade.mt5Ticket}\nType: ${trade.orderType}\nExit Price: ${trade.exitPrice}\nProfit/Loss: ${sign}$${trade.profitLoss}\nReason: ${trade.closeReason}`;
    sendTelegramNotification(message);

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
