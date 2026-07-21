import { API } from '../api.js';
import { APP } from '../app.js';

export const SettingsPage = {
  render: () => {
    return `
      <div class="card" style="max-width: 600px; margin: 0 auto;">
        <h3 style="margin-bottom: 2rem; font-weight: 600;">Engine Settings</h3>
        <form id="settings-form">
          
          <div style="display: flex; gap: 1rem;">
            <div class="form-group" style="flex: 1;">
              <label for="settings-broker">Broker</label>
              <input type="text" id="settings-broker" placeholder="XM">
            </div>
            <div class="form-group" style="flex: 1;">
              <label for="settings-account">Account Number</label>
              <input type="text" id="settings-account" placeholder="12345678">
            </div>
          </div>

          <div style="display: flex; gap: 1rem;">
            <div class="form-group" style="flex: 1;">
              <label for="settings-password">MT5 Password</label>
              <input type="password" id="settings-password" placeholder="••••••••">
            </div>
            <div class="form-group" style="flex: 1;" id="server-group">
              <label for="settings-server">MT5 Server</label>
              <div id="server-field-container">
                <input type="text" id="settings-server" placeholder="Detecting servers...">
              </div>
            </div>
          </div>

          <div class="form-group" id="terminal-group">
            <label for="settings-terminal-path">MT5 Terminal Path</label>
            <select id="settings-terminal-path">
              <option value="">Default Terminal Installation</option>
            </select>
          </div>

          <div id="connection-status-container" style="margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 0.75rem 1rem; border-radius: 6px; border: 1px solid var(--color-border);">
              <span style="font-size: 0.9rem; color: var(--color-text-muted);">Connection Status:</span>
              <span id="connection-badge" class="badge badge-pending">PENDING</span>
            </div>
          </div>

          <div id="connection-details-panel" style="display: none; background: rgba(46, 204, 113, 0.08); padding: 1.25rem; border-radius: 6px; margin-bottom: 1.5rem; border: 1px solid rgba(46, 204, 113, 0.3);">
            <h5 style="margin-top: 0; color: #2ecc71; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
              <i class="fa-solid fa-circle-check"></i> Account Verified
            </h5>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.9rem;">
              <div><strong style="color: var(--color-text-muted);">Account Name:</strong> <span id="panel-name">-</span></div>
              <div><strong style="color: var(--color-text-muted);">Account No:</strong> <span id="panel-number">-</span></div>
              <div><strong style="color: var(--color-text-muted);">Balance:</strong> <span id="panel-balance">-</span></div>
              <div><strong style="color: var(--color-text-muted);">Equity:</strong> <span id="panel-equity">-</span></div>
              <div><strong style="color: var(--color-text-muted);">Free Margin:</strong> <span id="panel-free-margin">-</span></div>
              <div><strong style="color: var(--color-text-muted);">Margin Level:</strong> <span id="panel-margin-level">-</span></div>
              <div><strong style="color: var(--color-text-muted);">Leverage:</strong> <span id="panel-leverage">-</span></div>
              <div><strong style="color: var(--color-text-muted);">Currency:</strong> <span id="panel-currency">-</span></div>
              <div><strong style="color: var(--color-text-muted);">Server:</strong> <span id="panel-server">-</span></div>
              <div><strong style="color: var(--color-text-muted);">Broker Company:</strong> <span id="panel-broker">-</span></div>
              <div><strong style="color: var(--color-text-muted);">Account Type:</strong> <span id="panel-type">-</span></div>
            </div>
          </div>

          <div id="connection-error-panel" style="display: none; background: rgba(231, 76, 60, 0.08); padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem; border: 1px solid rgba(231, 76, 60, 0.3); font-size: 0.9rem; color: #e74c3c;">
            <strong>Connection Failed:</strong> <span id="panel-error-text">-</span>
          </div>

          <button type="button" id="test-conn-btn" class="btn" style="background-color: var(--color-primary); color: white; width: 100%; margin-bottom: 1.5rem; font-weight: 600;">
            <span>🟢 Test Connection</span>
          </button>

          <div style="display: flex; gap: 1rem;">
            <div class="form-group" style="flex: 1;">
              <label for="settings-timeframe">Timeframe</label>
              <select id="settings-timeframe">
                <option value="M1">M1 (1 Minute)</option>
                <option value="M5">M5 (5 Minutes)</option>
              </select>
            </div>
            <div class="form-group" style="flex: 1;">
              <label for="settings-lot">Lot Size</label>
              <input type="number" id="settings-lot" step="0.01" min="0.01" value="0.20">
            </div>
          </div>

          <div style="display: flex; gap: 1rem;">
            <div class="form-group" style="flex: 1;">
              <label for="settings-max-trades">Max Active Trades</label>
              <input type="number" id="settings-max-trades" min="1" max="10" value="5">
            </div>
            <div class="form-group" style="flex: 1;">
              <label for="settings-sl-buffer">Stop Loss Buffer (Points)</label>
              <input type="number" id="settings-sl-buffer" step="0.01" min="0" value="0.02">
            </div>
          </div>

          <div class="form-group">
            <label for="settings-rr">Risk Reward Ratio</label>
            <input type="text" id="settings-rr" value="1:2">
          </div>

          <div style="display: flex; gap: 1.5rem; margin-top: 1.5rem; border-top: 1px solid var(--color-border); padding-top: 1.5rem;">
            <div class="form-group" style="flex-direction: row; align-items: center; gap: 0.75rem;">
              <input type="checkbox" id="settings-trailing-sl" style="width: auto; cursor: pointer;">
              <label for="settings-trailing-sl" style="cursor: pointer; margin-bottom: 0;">Enable Trailing Stop Loss</label>
            </div>
            <div class="form-group" style="flex-direction: row; align-items: center; gap: 0.75rem;">
              <input type="checkbox" id="settings-autotrading" style="width: auto; cursor: pointer;">
              <label for="settings-autotrading" style="cursor: pointer; margin-bottom: 0; color: var(--color-primary); font-weight: 700;">Enable Automated Trading</label>
            </div>
          </div>

          <!-- Demo Mode Fast Testing Mode Toggle -->
          <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 8px; padding: 1.25rem; margin-top: 1.5rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
              <div>
                <h5 style="margin: 0; color: #a78bfa; font-weight: 700; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;">
                  <i class="fa-solid fa-bolt" style="color: #f59e0b;"></i> Fast Demo Mode (Faster Trades for Testing)
                </h5>
                <p style="margin: 0.35rem 0 0 0; font-size: 0.8rem; color: var(--color-text-muted); line-height: 1.4;">
                  Relaxes pullback & pattern strictness so trades trigger faster on Demo accounts. 
                  <strong>Turn OFF for Real trading to restore strict protection.</strong>
                </p>
              </div>
              <div class="form-group" style="flex-direction: row; align-items: center; margin-bottom: 0;">
                <input type="checkbox" id="settings-demomode" style="width: 20px; height: 20px; cursor: pointer; accent-color: #a78bfa;">
              </div>
            </div>
          </div>

          <h4 style="margin: 1.5rem 0 1rem 0; font-weight: 600; border-top: 1px solid var(--color-border); padding-top: 1.5rem;">Telegram Integration</h4>
          
          <div class="form-group">
            <label for="settings-telegram-token">Telegram Bot Token</label>
            <input type="password" id="settings-telegram-token" placeholder="bot123456:ABC-DEF...">
          </div>
          <div class="form-group">
            <label for="settings-telegram-chat">Telegram Chat ID</label>
            <input type="text" id="settings-telegram-chat" placeholder="-100123456789">
          </div>

          <button type="submit" id="settings-submit-btn" class="btn btn-primary" style="width: 100%; margin-top: 1.5rem;">
            <span>Save Configuration</span>
          </button>
        </form>
      </div>
    `;
  },

  onMount: async () => {
    const form = document.getElementById('settings-form');
    const submitBtn = document.getElementById('settings-submit-btn');
    const testBtn = document.getElementById('test-conn-btn');
    
    const brokerInput = document.getElementById('settings-broker');
    const accountInput = document.getElementById('settings-account');
    const passwordInput = document.getElementById('settings-password');
    const terminalSelect = document.getElementById('settings-terminal-path');

    let isConnectionValidated = false;
    let availableServers = [];

    // Helper to update connection badge state UI
    const updateConnectionBadge = (status, error = null) => {
      const badge = document.getElementById('connection-badge');
      badge.className = 'badge';
      badge.textContent = status;

      const successPanel = document.getElementById('connection-details-panel');
      const errorPanel = document.getElementById('connection-error-panel');

      if (status === 'SUCCESS') {
        badge.classList.add('badge-success');
        badge.style.backgroundColor = '#2ecc71';
        badge.style.color = '#fff';
        errorPanel.style.display = 'none';
      } else if (status === 'FAILED') {
        badge.classList.add('badge-danger');
        badge.style.backgroundColor = '#e74c3c';
        badge.style.color = '#fff';
        successPanel.style.display = 'none';
        if (error) {
          errorPanel.style.display = 'block';
          document.getElementById('panel-error-text').textContent = error;
        }
      } else {
        badge.classList.add('badge-pending');
        badge.style.backgroundColor = '#f39c12';
        badge.style.color = '#fff';
        successPanel.style.display = 'none';
        errorPanel.style.display = 'none';
      }
    };

    // Helper to fetch and render servers for a given broker
    const fetchServers = async (brokerVal, selectServer = null) => {
      if (!brokerVal) {
        renderServerField([], null);
        return;
      }

      try {
        const response = await API.detectServers(brokerVal);
        availableServers = response.data || [];
        renderServerField(availableServers, selectServer);
      } catch (err) {
        console.error('Failed to detect servers:', err);
        renderServerField([], null);
      }
    };

    // Renders either select dropdown or fallback text input based on server list
    const renderServerField = (servers, selected) => {
      const container = document.getElementById('server-field-container');
      if (servers && servers.length > 0) {
        const isCustomSelected = selected && !servers.includes(selected);
        
        let options = servers.map(s => `<option value="${s}" ${s === selected ? 'selected' : ''}>${s}</option>`).join('');
        options += `<option value="__custom__" ${isCustomSelected ? 'selected' : ''}>Enter Server Manually...</option>`;
        
        container.innerHTML = `
          <select id="settings-server-select" style="width: 100%; margin-bottom: 0.5rem;">
            ${options}
          </select>
          <div id="custom-server-input-container" style="display: ${isCustomSelected ? 'block' : 'none'};">
            <input type="text" id="settings-server-custom" placeholder="e.g. XMGlobal-MT5 6" value="${isCustomSelected ? selected : ''}" style="width: 100%;">
          </div>
          <input type="hidden" id="settings-server" value="${selected || servers[0]}">
        `;

        const selectEl = document.getElementById('settings-server-select');
        const customContainer = document.getElementById('custom-server-input-container');
        const customInput = document.getElementById('settings-server-custom');
        const hiddenEl = document.getElementById('settings-server');

        selectEl.addEventListener('change', () => {
          if (selectEl.value === '__custom__') {
            customContainer.style.display = 'block';
            hiddenEl.value = customInput.value;
          } else {
            customContainer.style.display = 'none';
            hiddenEl.value = selectEl.value;
          }
          invalidateTestState();
        });

        customInput.addEventListener('input', () => {
          hiddenEl.value = customInput.value;
          invalidateTestState();
        });
      } else {
        container.innerHTML = `
          <input type="text" id="settings-server" placeholder="XMGlobal-MT5" value="${selected || ''}">
          <small style="color: var(--color-text-muted); display: block; margin-top: 0.25rem;">
            No predefined servers found. You can manually enter your MT5 server.
          </small>
        `;
        const serverField = document.getElementById('settings-server');
        serverField.addEventListener('input', invalidateTestState);
      }
    };

    // Invalidate validated state on any credential inputs change
    const invalidateTestState = () => {
      isConnectionValidated = false;
      submitBtn.disabled = true;
      updateConnectionBadge('PENDING');
    };

    // Bind change listeners to reset test validation state
    brokerInput.addEventListener('input', invalidateTestState);
    accountInput.addEventListener('input', invalidateTestState);
    passwordInput.addEventListener('input', invalidateTestState);
    terminalSelect.addEventListener('change', invalidateTestState);

    // Auto-fetch servers when user finishes entering broker name
    brokerInput.addEventListener('focusout', () => {
      const currentServer = document.getElementById('settings-server')?.value || '';
      fetchServers(brokerInput.value, currentServer);
    });

    try {
      // 1. Detect MT5 Terminals
      const termResponse = await API.detectTerminals();
      const terminals = termResponse.data || [];
      terminals.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.path;
        opt.textContent = `${t.name} (${t.path})`;
        terminalSelect.appendChild(opt);
      });

      // 2. Fetch current settings from database
      const settingsResponse = await API.getSettings();
      if (settingsResponse && settingsResponse.success) {
        const settings = settingsResponse.data;
        window.Store.settings = settings;

        // Populate fields
        brokerInput.value = settings.broker || '';
        accountInput.value = settings.accountNumber || '';
        passwordInput.value = settings.mt5Password || '';
        terminalSelect.value = settings.terminalPath || '';

        document.getElementById('settings-timeframe').value = settings.timeframe || 'M1';
        document.getElementById('settings-lot').value = settings.lotSize || 0.20;
        document.getElementById('settings-max-trades').value = settings.maxTrades || 5;
        document.getElementById('settings-sl-buffer').value = settings.stopLossBuffer || 0.02;
        document.getElementById('settings-rr').value = settings.riskReward || '1:2';
        document.getElementById('settings-trailing-sl').checked = settings.trailingSL !== false;
        document.getElementById('settings-autotrading').checked = settings.isAutoTrading === true;
        document.getElementById('settings-demomode').checked = settings.demoMode === true;
        document.getElementById('settings-telegram-token').value = settings.telegramBotToken || '';
        document.getElementById('settings-telegram-chat').value = settings.telegramChatId || '';

        // Enable save button once settings are loaded
        submitBtn.disabled = false;

        // Populate connection badge
        if (settings.connectionStatus) {
          updateConnectionBadge(settings.connectionStatus, settings.lastConnectionError);
          if (settings.connectionStatus === 'SUCCESS') {
            isConnectionValidated = true;
          }
        }
      }
    } catch (err) {
      console.error('Failed to load Settings:', err);
      APP.showToast('Failed to load current settings.', 'error');
    }

    // 3. Test Connection
    testBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const broker = brokerInput.value;
      const accountNumber = accountInput.value;
      const mt5Password = passwordInput.value;
      const server = document.getElementById('settings-server')?.value || '';
      const terminalPath = terminalSelect.value;

      if (!broker || !accountNumber || !mt5Password || !server) {
        APP.showToast('Please fill all connection fields before testing.', 'error');
        return;
      }

      try {
        testBtn.disabled = true;
        testBtn.innerHTML = '<span><i class="fa-solid fa-spinner fa-spin"></i> Connecting...</span>';
        updateConnectionBadge('PENDING');

        const response = await API.testConnection({
          broker,
          accountNumber,
          mt5Password,
          server,
          terminalPath
        });

        const result = response.data;
        if (result && result.success) {
          isConnectionValidated = true;
          submitBtn.disabled = false;
          updateConnectionBadge('SUCCESS');

          // Populate success details panel
          document.getElementById('connection-details-panel').style.display = 'block';
          document.getElementById('panel-name').textContent = result.accountName || 'N/A';
          document.getElementById('panel-number').textContent = result.accountNumber || 'N/A';
          document.getElementById('panel-balance').textContent = result.balance !== undefined ? `$${parseFloat(result.balance).toFixed(2)}` : '-';
          document.getElementById('panel-equity').textContent = result.equity !== undefined ? `$${parseFloat(result.equity).toFixed(2)}` : '-';
          document.getElementById('panel-free-margin').textContent = result.marginFree !== undefined ? `$${parseFloat(result.marginFree).toFixed(2)}` : '-';
          document.getElementById('panel-margin-level').textContent = result.marginLevel !== undefined ? `${parseFloat(result.marginLevel).toFixed(2)}%` : '-';
          document.getElementById('panel-leverage').textContent = result.leverage || 'N/A';
          document.getElementById('panel-currency').textContent = result.currency || 'N/A';
          document.getElementById('panel-server').textContent = result.server || 'N/A';
          document.getElementById('panel-broker').textContent = result.broker || 'N/A';
          document.getElementById('panel-type').textContent = result.accountType || 'N/A';

          APP.showToast('Connection verified successfully!', 'success');
        } else {
          isConnectionValidated = false;
          submitBtn.disabled = true;
          const errorMsg = result ? result.error : 'Connection verification failed';
          updateConnectionBadge('FAILED', errorMsg);
          APP.showToast('Connection failed: ' + errorMsg, 'error');
        }
      } catch (err) {
        isConnectionValidated = false;
        submitBtn.disabled = true;
        updateConnectionBadge('FAILED', err.message);
        APP.showToast(err.message || 'Connection test encountered an error', 'error');
      } finally {
        testBtn.disabled = false;
        testBtn.innerHTML = '<span>🟢 Test Connection</span>';
      }
    });

    // 4. Save Configuration
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const lotSize = parseFloat(document.getElementById('settings-lot').value);
      const maxTrades = parseInt(document.getElementById('settings-max-trades').value);
      const stopLossBuffer = parseFloat(document.getElementById('settings-sl-buffer').value);
      const riskReward = document.getElementById('settings-rr').value;
      const trailingSL = document.getElementById('settings-trailing-sl').checked;
      const isAutoTrading = document.getElementById('settings-autotrading').checked;
      const demoMode = document.getElementById('settings-demomode').checked;
      
      const broker = brokerInput.value;
      const accountNumber = accountInput.value;
      const mt5Password = passwordInput.value;
      const server = document.getElementById('settings-server')?.value || '';
      const terminalPath = terminalSelect.value;
      
      const telegramBotToken = document.getElementById('settings-telegram-token').value;
      const telegramChatId = document.getElementById('settings-telegram-chat').value;

      const payload = {
        lotSize,
        maxTrades,
        stopLossBuffer,
        riskReward,
        trailingSL,
        isAutoTrading,
        demoMode,
        broker,
        accountNumber,
        mt5Password,
        server,
        terminalPath,
        timeframe: document.getElementById('settings-timeframe').value,
        telegramBotToken,
        telegramChatId,
      };

      try {
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right: 0.5rem;"></i> Saving...';
        submitBtn.disabled = true;

        const response = await API.updateSettings(payload);
        if (response && response.success) {
          window.Store.settings = response.data;
          APP.showToast('Settings saved successfully', 'success');
        }
      } catch (error) {
        APP.showToast(error.message || 'Failed to update settings', 'error');
      } finally {
        submitBtn.innerHTML = '<span>Save Configuration</span>';
        submitBtn.disabled = false;
      }
    });
  }
};
