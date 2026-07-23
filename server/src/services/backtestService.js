const BacktestReport = require('../models/BacktestReport');
const Trade = require('../models/Trade');

const runBacktest = async (userId, params) => {
  const engineUrl = process.env.PYTHON_ENGINE_URL || 'http://localhost:5001';

  let reportData = null;
  try {
    const response = await fetch(`${engineUrl}/run-backtest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const result = await response.json();
    if (result && result.success) {
      reportData = result.data;
    } else {
      throw new Error(result.error || 'Engine failed to execute backtest simulation');
    }
  } catch (err) {
    console.error('[BacktestService] Python Engine HTTP error:', err.message);
    throw new Error(err.message || 'Failed to communicate with Trading Engine backtest module');
  }

  if (!reportData) {
    throw new Error('No backtest report received from Python Trading Engine');
  }

  // Save report to MongoDB
  const savedReport = await BacktestReport.create({
    userId,
    ...reportData,
  });

  return savedReport;
};

const getBacktestReports = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const total = await BacktestReport.countDocuments({ userId });
  const data = await BacktestReport.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return { total, page, limit, data };
};

const getBacktestReportById = async (userId, id) => {
  const report = await BacktestReport.findOne({ _id: id, userId });
  if (!report) {
    throw new Error('Backtest report not found');
  }
  return report;
};

const compareBacktests = async (userId, reportIds) => {
  if (!Array.isArray(reportIds) || reportIds.length === 0) {
    throw new Error('Please select at least one backtest report to compare');
  }

  const reports = await BacktestReport.find({
    _id: { $in: reportIds },
    userId,
  }).sort({ createdAt: -1 });

  return reports;
};

// Unified Trade Replay retriever (works for both live trade tickets/IDs and backtest trade tickets)
const getTradeReplay = async (userId, tradeIdOrTicket) => {
  // 1. Try finding live trade by _id or mt5Ticket
  let liveTrade = null;
  if (tradeIdOrTicket.match(/^[0-9a-fA-F]{24}$/)) {
    liveTrade = await Trade.findOne({ _id: tradeIdOrTicket, userId });
  }
  if (!liveTrade && !isNaN(Number(tradeIdOrTicket))) {
    liveTrade = await Trade.findOne({ mt5Ticket: Number(tradeIdOrTicket), userId });
  }

  if (liveTrade && liveTrade.replayData && liveTrade.replayData.candles) {
    return {
      ticket: liveTrade.mt5Ticket,
      symbol: liveTrade.symbol,
      orderType: liveTrade.orderType,
      lotSize: liveTrade.lotSize,
      entryPrice: liveTrade.entryPrice,
      exitPrice: liveTrade.exitPrice || 0,
      stopLoss: liveTrade.stopLoss || 0,
      takeProfit: liveTrade.takeProfit || 0,
      profitLoss: liveTrade.profitLoss || 0,
      closeReason: liveTrade.closeReason || 'OPEN',
      openTime: liveTrade.openTime,
      closeTime: liveTrade.closeTime,
      duration: liveTrade.duration || 0,
      riskReward: liveTrade.riskReward || '1:2',
      replayData: liveTrade.replayData,
    };
  }

  // 2. Search embedded trades across saved Backtest Reports
  const reports = await BacktestReport.find({ userId });
  for (const rep of reports) {
    for (const tr of rep.trades) {
      if (tr._id.toString() === tradeIdOrTicket || tr.ticket === Number(tradeIdOrTicket)) {
        return tr;
      }
    }
  }

  throw new Error(`Trade replay data not found for ID/Ticket: ${tradeIdOrTicket}`);
};

module.exports = {
  runBacktest,
  getBacktestReports,
  getBacktestReportById,
  compareBacktests,
  getTradeReplay,
};
