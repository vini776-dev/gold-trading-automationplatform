const BotSetting = require('../models/BotSetting');

const getSettings = async (userId) => {
  let settings = await BotSetting.findOne({ userId });

  // If no settings exist yet, create default settings document (fallback)
  if (!settings) {
    settings = await BotSetting.create({
      userId,
    });
  }

  return settings;
};

const updateSettings = async (userId, settingsData) => {
  let settings = await BotSetting.findOne({ userId });

  if (!settings) {
    settings = new BotSetting({ userId });
  }

  // Update provided fields
  Object.keys(settingsData).forEach((key) => {
    if (settingsData[key] !== undefined) {
      settings[key] = settingsData[key];
    }
  });

  await settings.save();
  return settings;
};

module.exports = {
  getSettings,
  updateSettings,
};
