const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reportDate: {
      type: Date,
      required: true,
    },
    reportType: {
      type: String,
      enum: ['Daily', 'Weekly', 'Monthly'],
      required: true,
    },
    totalTrades: {
      type: Number,
      default: 0,
      min: 0,
    },
    winningTrades: {
      type: Number,
      default: 0,
      min: 0,
    },
    losingTrades: {
      type: Number,
      default: 0,
      min: 0,
    },
    winRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    totalProfit: {
      type: Number,
      default: 0,
    },
    totalLoss: {
      type: Number,
      default: 0,
    },
    netProfit: {
      type: Number,
      default: 0,
    },
    drawdown: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageRR: {
      type: Number,
      default: 0,
    },
    profitFactor: {
      type: Number,
      default: 0,
    },
    expectancy: {
      type: Number,
      default: 0,
    },
    averageWin: {
      type: Number,
      default: 0,
    },
    averageLoss: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;
