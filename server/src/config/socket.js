const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const { COOKIE_NAME } = require('./cookieConfig');

let io = null;
let lastHeartbeatTime = 0;

// Updates the heartbeat timestamp from the Python Trading Engine
const updateEngineHeartbeat = () => {
  lastHeartbeatTime = Date.now();
};

const getEngineStatus = () => {
  const isOnline = Date.now() - lastHeartbeatTime < 15000; // 15 seconds threshold
  return {
    status: isOnline ? 'ONLINE' : 'OFFLINE',
    lastHeartbeat: lastHeartbeatTime > 0 ? new Date(lastHeartbeatTime).toISOString() : null,
  };
};

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  const traderNamespace = io.of('/trader');

  // Authentication Middleware
  traderNamespace.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        return next(new Error('Authentication error: Cookies missing'));
      }

      // Parse cookie
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map((c) => c.trim().split('='))
      );
      const token = cookies[COOKIE_NAME];

      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      // Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user || !user.isActive) {
        return next(new Error('Authentication error: User invalid or inactive'));
      }

      // Bind details to socket
      socket.user = { id: user._id.toString(), role: user.role };
      next();
    } catch (err) {
      return next(new Error('Authentication error: Token invalid or expired'));
    }
  });

  traderNamespace.on('connection', (socket) => {
    const userId = socket.user.id;
    const roomName = `user_${userId}`;
    socket.join(roomName);
    console.log(`Socket client connected to namespace /trader. Joined room: ${roomName}`);

    // Immediately send current engine status on connection
    (async () => {
      try {
        const BotSetting = require('../models/BotSetting');
        const MT5Account = require('../models/MT5Account');
        const settings = await BotSetting.findOne({ userId });
        if (settings) {
          const account = await MT5Account.findById(settings.activeAccountId);
          const isOnline = Date.now() - (settings.lastHeartbeat ? settings.lastHeartbeat.getTime() : 0) < 15000;
          emitUserEvent(userId, 'engine_status', {
            status: isOnline ? 'ONLINE' : 'OFFLINE',
            engineState: settings.engineState || 'OFFLINE',
            engineCommand: settings.engineCommand || 'NONE',
            emergencyStopActive: settings.emergencyStopActive || false,
            lastHeartbeat: settings.lastHeartbeat,
            metrics: {
              ...(settings.engineMetrics || {}),
              balance: account ? account.balance : 0.0,
              equity: account ? account.equity : 0.0,
              freeMargin: account ? account.marginFree : 0.0,
              marginLevel: account ? account.marginLevel : 0.0,
              floatingPnL: account ? account.floatingPnL : 0.0,
              todayProfit: account ? account.todayProfit : 0.0,
              openPositionsCount: account ? account.openPositions : 0
            }
          });
        } else {
          emitUserEvent(userId, 'engine_status', getEngineStatus());
        }
      } catch (err) {
        emitUserEvent(userId, 'engine_status', getEngineStatus());
      }
    })();

    socket.on('disconnect', () => {
      console.log(`Socket client disconnected. Left room: ${roomName}`);
    });
  });

  // Periodically broadcast engine status (every 3 seconds)
  setInterval(async () => {
    if (io) {
      try {
        const BotSetting = require('../models/BotSetting');
        const MT5Account = require('../models/MT5Account');
        const settings = await BotSetting.findOne({});
        if (settings) {
          const account = await MT5Account.findById(settings.activeAccountId);
          const isOnline = Date.now() - (settings.lastHeartbeat ? settings.lastHeartbeat.getTime() : 0) < 15000;
          const statusPayload = {
            status: isOnline ? 'ONLINE' : 'OFFLINE',
            engineState: settings.engineState || 'OFFLINE',
            engineCommand: settings.engineCommand || 'NONE',
            emergencyStopActive: settings.emergencyStopActive || false,
            lastHeartbeat: settings.lastHeartbeat,
            metrics: {
              ...(settings.engineMetrics || {}),
              balance: account ? account.balance : 0.0,
              equity: account ? account.equity : 0.0,
              freeMargin: account ? account.marginFree : 0.0,
              marginLevel: account ? account.marginLevel : 0.0,
              floatingPnL: account ? account.floatingPnL : 0.0,
              todayProfit: account ? account.todayProfit : 0.0,
              openPositionsCount: account ? account.openPositions : 0
            }
          };

          const roomName = `user_${settings.userId}`;
          const payload = {
            eventId: uuidv4(),
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            event: 'engine_status',
            data: statusPayload,
          };
          traderNamespace.to(roomName).emit('engine_status', payload);
        }
      } catch (err) {
        console.error('Socket periodic status broadcast failed:', err);
      }
    }
  }, 3000); // Check and broadcast every 3 seconds

  return io;
};

const emitUserEvent = (userId, eventName, data) => {
  if (!io) {
    console.error('Socket.IO not initialized. Event emission failed.');
    return;
  }

  const payload = {
    eventId: uuidv4(),
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    event: eventName,
    data,
  };

  const roomName = `user_${userId}`;
  io.of('/trader').to(roomName).emit(eventName, payload);
  console.log(`Emitted Socket event [${eventName}] to room [${roomName}]. eventId: ${payload.eventId}`);
};

module.exports = {
  initSocket,
  emitUserEvent,
  updateEngineHeartbeat,
};
