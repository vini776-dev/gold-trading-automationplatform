const mongoose = require('mongoose');

const mt5AccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    broker: {
      type: String,
      required: true,
      trim: true,
    },
    accountNumber: {
      type: String,
      required: true,
      trim: true,
    },
    server: {
      type: String,
      required: true,
      trim: true,
    },
    mt5Password: {
      type: String,
      required: true,
      trim: true,
    },
    terminalPath: {
      type: String,
      trim: true,
    },
    connectionStatus: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED'],
      default: 'PENDING',
    },
    lastConnectionTest: {
      type: Date,
    },
    lastConnectionError: {
      type: String,
    },
    isDefault: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const MT5Account = mongoose.model('MT5Account', mt5AccountSchema);
module.exports = MT5Account;
