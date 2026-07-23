const mongoose = require('mongoose');

const backtestReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    strategyVersion: {
      type: String,
      default: 'EMA Engulfing (V1)',
      required: true,
    },
    symbol: {
      type: String,
      default: 'XAUUSD',
      required: true,
    },
    timeframe: {
      type: String,
      default: 'M5',
      required: true,
    },
    period: {
      type: String, // e.g. '1M', '3M', '6M', '1Y', 'Custom'
      default: '1M',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    initialBalance: {
      type: Number,
      default: 10000.0,
    },
    finalBalance: {
      type: Number,
      default: 10000.0,
    },
    totalTrades: {
      type: Number,
      default: 0,
    },
    winningTrades: {
      type: Number,
      default: 0,
    },
    losingTrades: {
      type: Number,
      default: 0,
    },
    winRate: {
      type: Number,
      default: 0.0,
    },
    netProfit: {
      type: Number,
      default: 0.0,
    },
    profitFactor: {
      type: Number,
      default: 0.0,
    },
    maxDrawdown: {
      type: Number,
      default: 0.0,
    },
    expectancy: {
      type: Number,
      default: 0.0,
    },
    averageWin: {
      type: Number,
      default: 0.0,
    },
    averageLoss: {
      type: Number,
      default: 0.0,
    },
    equityCurve: [
      {
        timestamp: String,
        equity: Number,
      },
    ],
    trades: [
      {
        ticket: Number,
        symbol: String,
        orderType: String,
        lotSize: Number,
        entryPrice: Number,
        exitPrice: Number,
        stopLoss: Number,
        takeProfit: Number,
        profitLoss: Number,
        closeReason: String,
        openTime: String,
        closeTime: String,
        duration: Number,
        riskReward: String,
        replayData: {
          candles: [
            {
              time: Number,
              open: Number,
              high: Number,
              low: Number,
              close: Number,
              volume: Number,
              ema9: Number,
              ema15: Number,
              atr: Number,
            },
          ],
          entryIndex: Number,
          exitIndex: Number,
          filtersBreakdown: mongoose.Schema.Types.Mixed,
          signalConfidence: Number,
          signalReason: String,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const BacktestReport = mongoose.model('BacktestReport', backtestReportSchema);
module.exports = BacktestReport;
