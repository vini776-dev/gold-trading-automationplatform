const mongoose = require('mongoose');

const botSettingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    broker: {
      type: String,
      trim: true,
    },
    accountNumber: {
      type: String,
      trim: true,
    },
    server: {
      type: String,
      trim: true,
    },
    symbol: {
      type: String,
      default: 'XAUUSD',
      trim: true,
    },
    timeframe: {
      type: String,
      default: 'M1',
      trim: true,
    },
    emaPeriod: {
      type: Number,
      default: 11,
      min: 1,
    },
    rsiPeriod: {
      type: Number,
      default: 14,
      min: 1,
    },
    fractalPeriod: {
      type: Number,
      default: 5,
      min: 3,
    },
    lotSize: {
      type: Number,
      default: 0.2,
      min: 0.01,
    },
    maxTrades: {
      type: Number,
      default: 5,
      min: 1,
    },
    stopLossBuffer: {
      type: Number,
      default: 0.02,
      min: 0,
    },
    riskReward: {
      type: String,
      default: '1:2',
      trim: true,
    },
    trailingSL: {
      type: Boolean,
      default: true,
    },
    telegramEnabled: {
      type: Boolean,
      default: true,
    },
    botStatus: {
      type: Boolean,
      default: false,
    },
    isAutoTrading: {
      type: Boolean,
      default: false,
    },
    telegramBotToken: {
      type: String,
      trim: true,
    },
    telegramChatId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const BotSetting = mongoose.model('BotSetting', botSettingSchema);
module.exports = BotSetting;
