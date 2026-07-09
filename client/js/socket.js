import { APP } from './app.js';

export const SocketClient = {
  socket: null,

  connect: () => {
    if (SocketClient.socket) return;

    // Connect to secured namespace /trader
    const socket = io('http://localhost:5000/trader', {
      withCredentials: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    SocketClient.socket = socket;

    socket.on('connect', () => {
      console.log('Socket.IO connected successfully.');
      APP.showToast('Real-time updates active', 'success');
    });

    socket.on('disconnect', () => {
      console.warn('Socket.IO connection lost.');
      APP.showToast('Real-time connection lost', 'error');
    });

    // 1. Listen for new trade executions
    socket.on('trade_started', (payload) => {
      console.log('Socket event [trade_started]:', payload);
      const newTrade = payload.data;
      
      // Update global store
      window.Store.activeTrades.unshift(newTrade);
      window.Store.dashboard.activeTradesCount += 1;
      
      // Display alert and refresh current view if needed
      APP.showToast(`New Trade Executed: ${newTrade.orderType} ${newTrade.symbol}`, 'success');
      APP.refreshCurrentPage();
    });

    // 2. Listen for trade closures
    socket.on('trade_closed', (payload) => {
      console.log('Socket event [trade_closed]:', payload);
      const closedTrade = payload.data;

      // Update store: remove from active trades list
      window.Store.activeTrades = window.Store.activeTrades.filter(
        (t) => t.mt5Ticket !== closedTrade.mt5Ticket
      );
      window.Store.dashboard.activeTradesCount = Math.max(0, window.Store.dashboard.activeTradesCount - 1);
      
      APP.showToast(`Trade Closed: ${closedTrade.closeReason} hit! PnL: $${closedTrade.profitLoss}`, closedTrade.profitLoss >= 0 ? 'success' : 'error');
      APP.refreshCurrentPage();
    });

    // 3. Listen for setting updates
    socket.on('settings_updated', (payload) => {
      console.log('Socket event [settings_updated]:', payload);
      window.Store.settings = payload.data;
      APP.refreshCurrentPage();
    });

    // 4. Listen for engine heartbeat updates
    socket.on('engine_status', (payload) => {
      const statusData = payload.data;
      window.Store.engineStatus = statusData;

      // Update Header elements
      const statusDot = document.getElementById('engine-status-dot');
      const statusText = document.getElementById('engine-status-text');

      if (statusDot && statusText) {
        if (statusData.status === 'ONLINE') {
          statusDot.className = 'status-dot online';
          statusText.innerText = 'ONLINE';
          statusText.style.color = 'var(--color-success)';
        } else {
          statusDot.className = 'status-dot offline';
          statusText.innerText = 'OFFLINE';
          statusText.style.color = 'var(--color-text-secondary)';
        }
      }
    });
  },

  disconnect: () => {
    if (SocketClient.socket) {
      SocketClient.socket.disconnect();
      SocketClient.socket = null;
    }
  }
};
