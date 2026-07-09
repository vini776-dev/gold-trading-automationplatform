const BotSetting = require('../models/BotSetting');
const MT5Account = require('../models/MT5Account');

const getSettings = async (userId, isInternalCall = false) => {
  let settings = await BotSetting.findOne({ userId }).populate('activeAccountId');

  if (!settings) {
    settings = await BotSetting.create({
      userId,
    });
  }

  const settingsObj = settings.toObject();

  if (settings.activeAccountId) {
    const account = settings.activeAccountId;
    settingsObj.broker = account.broker || '';
    settingsObj.accountNumber = account.accountNumber || '';
    settingsObj.server = account.server || '';
    settingsObj.terminalPath = account.terminalPath || '';
    settingsObj.connectionStatus = account.connectionStatus || 'PENDING';
    settingsObj.lastConnectionTest = account.lastConnectionTest || null;
    settingsObj.lastConnectionError = account.lastConnectionError || null;

    if (isInternalCall) {
      // Internal call (Python engine) gets the raw encrypted password to decrypt locally
      settingsObj.mt5Password = account.mt5Password || '';
    } else {
      // User browser gets masked password
      settingsObj.mt5Password = account.mt5Password ? '******' : '';
    }
  } else {
    settingsObj.broker = '';
    settingsObj.accountNumber = '';
    settingsObj.mt5Password = '';
    settingsObj.server = '';
    settingsObj.terminalPath = '';
    settingsObj.connectionStatus = 'PENDING';
    settingsObj.lastConnectionTest = null;
    settingsObj.lastConnectionError = null;
  }

  return settingsObj;
};

const updateSettings = async (userId, settingsData) => {
  let settings = await BotSetting.findOne({ userId });

  if (!settings) {
    settings = new BotSetting({ userId });
  }

  const { broker, accountNumber, mt5Password, server, terminalPath, ...generalSettings } = settingsData;

  if (broker !== undefined || accountNumber !== undefined || mt5Password !== undefined || server !== undefined || terminalPath !== undefined) {
    let account = await MT5Account.findOne({ userId, isDefault: true });
    if (!account) {
      account = new MT5Account({ userId, isDefault: true });
    }

    if (broker !== undefined) account.broker = broker;
    if (accountNumber !== undefined) account.accountNumber = accountNumber;
    if (server !== undefined) account.server = server;
    if (terminalPath !== undefined) account.terminalPath = terminalPath;

    if (mt5Password !== undefined && mt5Password !== '******' && mt5Password !== '') {
      const { encrypt } = require('../utils/crypto');
      account.mt5Password = encrypt(mt5Password);
    }

    await account.save();
    settings.activeAccountId = account._id;
  }

  Object.keys(generalSettings).forEach((key) => {
    if (generalSettings[key] !== undefined) {
      settings[key] = generalSettings[key];
    }
  });

  await settings.save();
  return getSettings(userId, false);
};

module.exports = {
  getSettings,
  updateSettings,
};
