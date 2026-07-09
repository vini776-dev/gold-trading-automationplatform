import { API } from './api.js';
import { Router } from './router.js';
import { SocketClient } from './socket.js';

// 1. Initialize Central Global Store
window.Store = {
  user: null,
  dashboard: {
    balance: 10000.0,
    equity: 10000.0,
    dailyProfit: 0.0,
    winRate: 0.0,
    activeTradesCount: 0,
    drawdown: 0.0,
  },
  activeTrades: [],
  reports: [],
  settings: {},
  engineStatus: {
    status: 'OFFLINE',
    lastHeartbeat: null,
  },
  socket: null,
  serverStatus: 'ONLINE',
};

// 2. Central APP bootstraper
export const APP = {
  init: async () => {
    // Reconnect Retry listener for offline overlay
    const reconnectBtn = document.getElementById('reconnect-btn');
    if (reconnectBtn) {
      reconnectBtn.addEventListener('click', async () => {
        try {
          reconnectBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right: 0.5rem;"></i> Retrying...';
          await API.verify();
          window.location.reload();
        } catch (err) {
          APP.showToast('Reconnection failed. Server is still unreachable.', 'error');
          reconnectBtn.innerHTML = '<i class="fa-solid fa-rotate-right" style="margin-right: 0.5rem;"></i> Retry Connection';
        }
      });
    }

    // Attempt token session verification on launch
    try {
      const response = await API.verify();
      if (response && response.success) {
        window.Store.user = response.data;
        document.getElementById('username-display').innerText = response.data.fullName;
        
        // Connect Socket.IO
        SocketClient.connect();
      }
    } catch (error) {
      console.log('No valid session active. Redirecting to login...');
    } finally {
      // Navigate to correct starting route
      Router.navigate();
    }

    // Configure logout logic
    const logoutBtn = document.getElementById('logout-link');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await API.logout();
          SocketClient.disconnect();
          window.Store.user = null;
          window.location.hash = '#/login';
          Router.navigate();
          APP.showToast('Logged out successfully', 'success');
        } catch (err) {
          APP.showToast('Logout failed', 'error');
        }
      });
    }
  },

  showToast: (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = message;
    
    container.appendChild(toast);
    
    // Automatically delete after 4 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 4000);
  },

  refreshCurrentPage: () => {
    Router.navigate();
  }
};

// Bootstrap application on page load
window.addEventListener('DOMContentLoaded', APP.init);
