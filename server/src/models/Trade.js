const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mt5Ticket: {
      type: Number,
      required: true,
      unique: true,
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
    },
    orderType: {
      type: String,
      enum: ['BUY', 'SELL'],
      required: true,
    },
    lotSize: {
      type: Number,
      required: true,
      min: 0.01,
    },
    entryPrice: {
      type: Number,
      required: true,
    },
    exitPrice: {
      type: Number,
    },
    stopLoss: {
      type: Number,
    },
    takeProfit: {
      type: Number,
    },
    riskReward: {
      type: String,
      default: '1:2',
    },
    strategy: {
      type: String,
    },
    status: {
      type: String,
      enum: ['OPEN', 'CLOSED'],
      required: true,
      default: 'OPEN',
    },
    profitLoss: {
      type: Number,
    },
    openTime: {
      type: Date,
      required: true,
    },
    closeTime: {
      type: Date,
    },
    duration: {
      type: Number, // in seconds
    },
    closeReason: {
      type: String, // e.g. 'TP', 'SL', 'Manual'
    },
    tradeSource: {
      type: String,
      enum: ['manual', 'bot'],
      default: 'bot',
    },
    broker: {
      type: String,
      trim: true,
    },
    executionLatency: {
      type: Number, // in milliseconds
    },
    replayData: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

const Trade = mongoose.model('Trade', tradeSchema);
module.exports = Trade;
