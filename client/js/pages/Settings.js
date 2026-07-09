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
              <label for="settings-server">MT5 Server</label>
              <input type="text" id="settings-server" placeholder="XM-UltraLow">
            </div>
            <div class="form-group" style="flex: 1;">
              <label for="settings-timeframe">Timeframe</label>
              <select id="settings-timeframe">
                <option value="M1">M1 (1 Minute)</option>
                <option value="M5">M5 (5 Minutes)</option>
              </select>
            </div>
          </div>

          <div style="display: flex; gap: 1rem;">
            <div class="form-group" style="flex: 1;">
              <label for="settings-lot">Lot Size</label>
              <input type="number" id="settings-lot" step="0.01" min="0.01" value="0.20">
            </div>
            <div class="form-group" style="flex: 1;">
              <label for="settings-max-trades">Max Active Trades</label>
              <input type="number" id="settings-max-trades" min="1" max="10" value="5">
            </div>
          </div>

          <div style="display: flex; gap: 1rem;">
            <div class="form-group" style="flex: 1;">
              <label for="settings-sl-buffer">Stop Loss Buffer (Points)</label>
              <input type="number" id="settings-sl-buffer" step="0.01" min="0" value="0.02">
            </div>
            <div class="form-group" style="flex: 1;">
              <label for="settings-rr">Risk Reward Ratio</label>
              <input type="text" id="settings-rr" value="1:2">
            </div>
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

    try {
      // 1. Fetch current settings from database
      const settings = await API.getSettings();
      if (settings) {
        window.Store.settings = settings;

        // Populate fields
        document.getElementById('settings-broker').value = settings.broker || '';
        document.getElementById('settings-account').value = settings.accountNumber || '';
        document.getElementById('settings-server').value = settings.server || '';
        document.getElementById('settings-timeframe').value = settings.timeframe || 'M1';
        document.getElementById('settings-lot').value = settings.lotSize || 0.20;
        document.getElementById('settings-max-trades').value = settings.maxTrades || 5;
        document.getElementById('settings-sl-buffer').value = settings.stopLossBuffer || 0.02;
        document.getElementById('settings-rr').value = settings.riskReward || '1:2';
        document.getElementById('settings-trailing-sl').checked = settings.trailingSL !== false;
        document.getElementById('settings-autotrading').checked = settings.isAutoTrading === true;
        document.getElementById('settings-telegram-token').value = settings.telegramBotToken || '';
        document.getElementById('settings-telegram-chat').value = settings.telegramChatId || '';
      }
    } catch (err) {
      console.error('Failed to load Settings:', err);
      APP.showToast('Failed to load current settings.', 'error');
    }

    // 2. Bind form submit handler
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const lotSize = parseFloat(document.getElementById('settings-lot').value);
      const maxTrades = parseInt(document.getElementById('settings-max-trades').value);
      const stopLossBuffer = parseFloat(document.getElementById('settings-sl-buffer').value);
      const riskReward = document.getElementById('settings-rr').value;
      const trailingSL = document.getElementById('settings-trailing-sl').checked;
      const isAutoTrading = document.getElementById('settings-autotrading').checked;
      
      const broker = document.getElementById('settings-broker').value;
      const accountNumber = document.getElementById('settings-account').value;
      const server = document.getElementById('settings-server').value;
      const timeframe = document.getElementById('settings-timeframe').value;
      
      const telegramBotToken = document.getElementById('settings-telegram-token').value;
      const telegramChatId = document.getElementById('settings-telegram-chat').value;

      const payload = {
        lotSize,
        maxTrades,
        stopLossBuffer,
        riskReward,
        trailingSL,
        isAutoTrading,
        broker,
        accountNumber,
        server,
        timeframe,
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
