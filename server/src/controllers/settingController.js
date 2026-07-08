const settingService = require('../services/settingService');

const handleGetSettings = async (req, res) => {
  try {
    const settings = await settingService.getSettings(req.user._id);
    return res.status(200).json({
      success: true,
      data: settings,
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

const handleUpdateSettings = async (req, res) => {
  try {
    const settings = await settingService.updateSettings(req.user._id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settings,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      status: 'ERROR',
      code: 'SETTINGS_UPDATE_FAILED',
      message: error.message,
    });
  }
};

module.exports = {
  handleGetSettings,
  handleUpdateSettings,
};
