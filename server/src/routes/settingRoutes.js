const express = require('express');
const settingController = require('../controllers/settingController');
const { authenticate } = require('../middlewares/authMiddleware');
const { validateUpdateSettings } = require('../validators/settingValidator');

const router = express.Router();

router.use(authenticate);

router.get('/', settingController.handleGetSettings);
router.put('/', validateUpdateSettings, settingController.handleUpdateSettings);

module.exports = router;
