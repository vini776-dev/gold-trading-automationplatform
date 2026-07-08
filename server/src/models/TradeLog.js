const mongoose = require('mongoose');

const tradeLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tradeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trade',
    },
    logType: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    level: {
      type: String,
      enum: ['info', 'warn', 'error'],
      default: 'info',
    },
  },
  {
    timestamps: true,
  }
);

const TradeLog = mongoose.model('TradeLog', tradeLogSchema);
module.exports = TradeLog;
