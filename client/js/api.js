const BASE_URL = `http://${window.location.hostname}:5000/api/v1`;

// Shared function to handle HTTP fetch
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  // Parse credential flags (for HTTP-only cookie support)
  options.credentials = 'include';
  if (!options.headers) {
    options.headers = {};
  }
  if (!(options.body instanceof FormData) && typeof options.body === 'object') {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, options);
    
    // Reset server status to ONLINE on successful request
    if (window.Store.serverStatus === 'OFFLINE') {
      window.Store.serverStatus = 'ONLINE';
      document.getElementById('offline-overlay').style.display = 'none';
    }

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'HTTP request failed');
    }
    return result;
  } catch (error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('Load failed') || error.message.includes('NetworkError')) {
      // Trigger Server Offline UI Overlay
      window.Store.serverStatus = 'OFFLINE';
      document.getElementById('offline-overlay').style.display = 'flex';
    }
    throw error;
  }
}

export const API = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  verify: () => request('/auth/verify', { method: 'GET' }),

  // Dashboard
  getSummary: () => request('/dashboard/summary', { method: 'GET' }),

  // Trades
  getActiveTrades: () => request('/trades/active', { method: 'GET' }),
  getTradeHistory: (page = 1, limit = 20) => request(`/trades/history?page=${page}&limit=${limit}`, { method: 'GET' }),

  // Settings
  getSettings: () => request('/settings', { method: 'GET' }),
  updateSettings: (settingsData) => request('/settings', { method: 'PUT', body: settingsData }),
  detectServers: (broker) => request('/settings/detect-servers', { method: 'POST', body: { broker } }),
  detectTerminals: () => request('/settings/detect-terminals', { method: 'GET' }),
  testConnection: (connectionData) => request('/settings/test-connection', { method: 'POST', body: connectionData }),

  // Reports
  getReports: (page = 1, limit = 20) => request(`/reports?page=${page}&limit=${limit}`, { method: 'GET' }),

  // Logs
  getLogs: (page = 1, limit = 20, level = '') => request(`/logs?page=${page}&limit=${limit}&level=${level}`, { method: 'GET' }),
};
