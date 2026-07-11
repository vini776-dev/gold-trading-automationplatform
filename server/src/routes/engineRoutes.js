const express = require('express');
const engineController = require('../controllers/engineController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Apply authenticate middleware globally to all engine routes
router.use(authenticate);

router.post('/start', engineController.handleStartEngine);
router.post('/pause', engineController.handlePauseEngine);
router.post('/stop', engineController.handleStopEngine);
router.post('/restart', engineController.handleRestartEngine);
router.post('/emergency-stop', engineController.handleEmergencyStop);
router.post('/heartbeat', engineController.handleHeartbeat);

module.exports = router;
