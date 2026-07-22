import { API } from '../api.js';
import { APP } from '../app.js';

export const DashboardPage = {
  render: () => {
    return `
      <!-- Trading Control Panel -->
      <div class="card" id="control-panel-container" style="margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem;">
        <!-- Top Row: Title, Badge, and Buttons -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <h3 style="margin: 0; font-weight: 600;">Trading Control Panel</h3>
            <span id="engine-state-badge" class="badge" style="font-size: 0.9rem; padding: 0.35rem 0.75rem; border-radius: 4px; font-weight: 600; text-transform: uppercase;">OFFLINE</span>
          </div>
          
          <!-- Control Buttons -->
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button id="btn-engine-start" class="btn" style="background-color: #2ecc71; color: white; padding: 0.5rem 1rem; font-weight: 600; border-radius: 4px; display: flex; align-items: center; gap: 0.5rem; border: none; cursor: pointer;">
              <i class="fa-solid fa-play"></i> Start
            </button>
            <button id="btn-engine-pause" class="btn" style="background-color: #f1c40f; color: white; padding: 0.5rem 1rem; font-weight: 600; border-radius: 4px; display: flex; align-items: center; gap: 0.5rem; border: none; cursor: pointer;">
              <i class="fa-solid fa-pause"></i> Pause
            </button>
            <button id="btn-engine-stop" class="btn" style="background-color: #7f8c8d; color: white; padding: 0.5rem 1rem; font-weight: 600; border-radius: 4px; display: flex; align-items: center; gap: 0.5rem; border: none; cursor: pointer;">
              <i class="fa-solid fa-stop"></i> Stop
            </button>
            <button id="btn-engine-restart" class="btn" style="background-color: #3498db; color: white; padding: 0.5rem 1rem; font-weight: 600; border-radius: 4px; display: flex; align-items: center; gap: 0.5rem; border: none; cursor: pointer;">
              <i class="fa-solid fa-rotate"></i> Restart
            </button>
            <button id="btn-engine-emergency" class="btn" style="background-color: #e74c3c; color: white; padding: 0.5rem 1.25rem; font-weight: 700; border-radius: 4px; display: flex; align-items: center; gap: 0.5rem; border: none; cursor: pointer; box-shadow: 0 0 12px rgba(231, 76, 60, 0.4);">
              🛑 Emergency Stop
            </button>
          </div>
        </div>

        <!-- Telemetry Statistics Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; padding-top: 1.25rem; border-top: 1px solid var(--color-border); font-size: 0.9rem;">
          <div><strong style="color: var(--color-text-muted);">Strategy:</strong> <span id="stat-strategy">RSI-EMA Cross</span></div>
          <div><strong style="color: var(--color-text-muted);">Broker:</strong> <span id="stat-broker">-</span></div>
          <div><strong style="color: var(--color-text-muted);">Account:</strong> <span id="stat-account">-</span></div>
          <div><strong style="color: var(--color-text-muted);">Server:</strong> <span id="stat-server">-</span></div>
          <div><strong style="color: var(--color-text-muted);">Symbol:</strong> <span id="stat-symbol">-</span></div>
          <div><strong style="color: var(--color-text-muted);">Open Positions:</strong> <span id="stat-positions">-</span></div>
          <div><strong style="color: var(--color-text-muted);">Free Margin:</strong> <span id="stat-free-margin">-</span></div>
          <div><strong style="color: var(--color-text-muted);">Margin Level:</strong> <span id="stat-margin-level">-</span></div>
          <div><strong style="color: var(--color-text-muted);">Floating PnL:</strong> <span id="stat-floating-pnl">-</span></div>
          <div><strong style="color: var(--color-text-muted);">Running Time:</strong> <span id="stat-runtime">00:00:00</span></div>
          <div><strong style="color: var(--color-text-muted);">Last Heartbeat:</strong> <span id="stat-heartbeat">-</span></div>
        </div>
      </div>

      <!-- Metric Cards Grid -->
      <div class="metric-grid">
        <div class="stat-card" id="card-balance">
          <h3>Balance</h3>
          <div class="value shimmer skeleton-value"></div>
        </div>
        <div class="stat-card" id="card-equity">
          <h3>Equity</h3>
          <div class="value shimmer skeleton-value"></div>
        </div>
        <div class="stat-card" id="card-profit">
          <h3>Today's Profit</h3>
          <div class="value shimmer skeleton-value"></div>
        </div>
        <div class="stat-card" id="card-winrate">
          <h3>Win Rate</h3>
          <div class="value shimmer skeleton-value"></div>
        </div>
      </div>

      <!-- Main Dashboard Content Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
        <!-- Chart Container -->
        <div class="card">
          <h3 style="margin-bottom: 1.5rem; font-weight: 600;">Equity Curve</h3>
          <div style="position: relative; height: 300px; width: 100%;">
            <canvas id="equity-chart"></canvas>
          </div>
        </div>

        <!-- Active Trades Container -->
        <div class="card">
          <h3 style="margin-bottom: 1.5rem; font-weight: 600;">Active Open Positions</h3>
          <div class="table-container">
            <table class="table" id="active-trades-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Type</th>
                  <th>Lot</th>
                  <th>Entry</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="active-trades-list">
                <tr>
                  <td colspan="6" class="shimmer skeleton-text" style="height: 3rem;"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Dashboard Manual Close Modal -->
      <div id="dash-manual-close-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9999; justify-content: center; align-items: center;">
        <div class="card" style="width: 400px; max-width: 90%; text-align: center; border: 1px solid var(--color-danger); padding: 2rem;">
          <div style="font-size: 2.5rem; color: var(--color-danger); margin-bottom: 1rem;"><i class="fa-solid fa-circle-exclamation"></i></div>
          <h3 style="margin-bottom: 0.5rem;">Close Position Manually?</h3>
          <p style="color: var(--color-text-secondary); margin-bottom: 1.5rem; font-size: 0.9rem;">
            Are you sure you want to close trade <strong id="dash-close-modal-ticket-str">#—</strong> at current market price?
          </p>
          <div style="display: flex; gap: 1rem; justify-content: center;">
            <button id="dash-close-modal-cancel-btn" class="btn" style="background: rgba(255,255,255,0.1); color: #fff;">Cancel</button>
            <button id="dash-close-modal-confirm-btn" class="btn" style="background: var(--color-danger); color: #fff;">Yes, Close Trade</button>
          </div>
        </div>
      </div>
    `;
  },

  onMount: async () => {
    const btnStart = document.getElementById('btn-engine-start');
    const btnPause = document.getElementById('btn-engine-pause');
    const btnStop = document.getElementById('btn-engine-stop');
    const btnRestart = document.getElementById('btn-engine-restart');
    const btnEmergency = document.getElementById('btn-engine-emergency');
    const stateBadge = document.getElementById('engine-state-badge');

    // Helper to format runtime seconds
    const formatRuntime = (seconds) => {
      if (!seconds || seconds <= 0) return '00:00:00';
      const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
      const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
      const secs = (seconds % 60).toString().padStart(2, '0');
      return `${hrs}:${mins}:${secs}`;
    };

    // Helper to style engine status badge dynamically
    const updateStateBadge = (state) => {
      if (!stateBadge) return;
      stateBadge.textContent = state;
      stateBadge.style.color = '#fff';
      
      if (state === 'RUNNING') {
        stateBadge.style.backgroundColor = '#2ecc71';
      } else if (state === 'MONITORING') {
        stateBadge.style.backgroundColor = '#1abc9c';
      } else if (state === 'PAUSED') {
        stateBadge.style.backgroundColor = '#f1c40f';
      } else if (state === 'STARTING' || state === 'STOPPING') {
        stateBadge.style.backgroundColor = '#f39c12';
      } else if (state === 'ERROR') {
        stateBadge.style.backgroundColor = '#e74c3c';
      } else {
        stateBadge.style.backgroundColor = '#7f8c8d';
      }
    };

    // Enable/disable buttons based on engine state
    const updateButtonStates = (state) => {
      if (!btnStart) return;

      if (state === 'OFFLINE' || state === 'ERROR') {
        btnStart.disabled = false;
        btnPause.disabled = true;
        btnStop.disabled = true;
        btnRestart.disabled = true;
        btnEmergency.disabled = true;
      } else if (state === 'RUNNING' || state === 'MONITORING') {
        btnStart.disabled = true;
        btnPause.disabled = false;
        btnStop.disabled = false;
        btnRestart.disabled = false;
        btnEmergency.disabled = false;
      } else if (state === 'PAUSED') {
        btnStart.disabled = false; // Re-start or Resume
        btnPause.disabled = true;
        btnStop.disabled = false;
        btnRestart.disabled = false;
        btnEmergency.disabled = false;
      } else if (state === 'STARTING' || state === 'STOPPING') {
        btnStart.disabled = true;
        btnPause.disabled = true;
        btnStop.disabled = true;
        btnRestart.disabled = true;
        btnEmergency.disabled = true;
      }
    };

    // Global hook for live WebSocket telemetry broadcasts
    window.updateDashboardControlPanel = (statusData) => {
      const badge = document.getElementById('engine-state-badge');
      if (!badge) {
        // Clean up hook if we moved to another page
        window.updateDashboardControlPanel = null;
        return;
      }

      // Update state badge & actions
      const state = statusData.engineState || 'OFFLINE';
      updateStateBadge(state);
      updateButtonStates(state);

      // Update metrics
      const metrics = statusData.metrics || {};
      document.getElementById('stat-strategy').textContent = metrics.strategyName || 'RSI-EMA Cross';
      document.getElementById('stat-broker').textContent = metrics.connectedBroker || '-';
      document.getElementById('stat-account').textContent = metrics.connectedAccount || '-';
      document.getElementById('stat-server').textContent = metrics.connectedServer || '-';
      document.getElementById('stat-symbol').textContent = metrics.currentSymbol || '-';
      document.getElementById('stat-positions').textContent = metrics.openPositionsCount !== undefined ? metrics.openPositionsCount : '-';
      
      // Live MT5 margins
      document.getElementById('stat-free-margin').textContent = metrics.freeMargin !== undefined ? `$${parseFloat(metrics.freeMargin).toFixed(2)}` : '-';
      document.getElementById('stat-margin-level').textContent = metrics.marginLevel !== undefined ? `${parseFloat(metrics.marginLevel).toFixed(2)}%` : '-';
      
      const fpnlEl = document.getElementById('stat-floating-pnl');
      if (fpnlEl && metrics.floatingPnL !== undefined) {
        const fpnl = parseFloat(metrics.floatingPnL);
        fpnlEl.textContent = `${fpnl >= 0 ? '+' : ''}$${fpnl.toFixed(2)}`;
        fpnlEl.style.color = fpnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
        fpnlEl.style.fontWeight = '600';
      } else if (fpnlEl) {
        fpnlEl.textContent = '-';
        fpnlEl.style.color = 'inherit';
      }

      document.getElementById('stat-runtime').textContent = formatRuntime(metrics.runningTime);
      
      const hb = statusData.lastHeartbeat;
      document.getElementById('stat-heartbeat').textContent = hb ? new Date(hb).toLocaleTimeString() : '-';

      // Dynamically update primary stat cards in real time (no page refresh)
      const balanceEl = document.getElementById('card-balance');
      const equityEl = document.getElementById('card-equity');
      const profitEl = document.getElementById('card-profit');

      if (balanceEl && metrics.balance !== undefined) {
        balanceEl.innerHTML = `<h3>Balance</h3><div class="value">$${parseFloat(metrics.balance).toFixed(2)}</div>`;
      }
      if (equityEl && metrics.equity !== undefined) {
        equityEl.innerHTML = `<h3>Equity</h3><div class="value">$${parseFloat(metrics.equity).toFixed(2)}</div>`;
      }
      if (profitEl && metrics.todayProfit !== undefined) {
        const tp = parseFloat(metrics.todayProfit);
        const profitSign = tp >= 0 ? '+' : '';
        const profitColor = tp >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
        profitEl.innerHTML = `<h3>Today's Profit</h3><div class="value" style="color: ${profitColor};">${profitSign}$${tp.toFixed(2)}</div>`;
      }
    };

    // 1. Initial State UI Load
    if (window.Store.engineStatus) {
      window.updateDashboardControlPanel(window.Store.engineStatus);
    } else {
      updateStateBadge('OFFLINE');
      updateButtonStates('OFFLINE');
    }

    // Bind Action Listeners
    btnStart.addEventListener('click', async () => {
      try {
        btnStart.disabled = true;
        const res = await API.startEngine();
        if (res.success) {
          APP.showToast('Engine Start command issued successfully.', 'success');
        }
      } catch (err) {
        APP.showToast(err.message || 'Failed to start engine.', 'error');
        btnStart.disabled = false;
      }
    });

    btnPause.addEventListener('click', async () => {
      try {
        btnPause.disabled = true;
        const res = await API.pauseEngine();
        if (res.success) {
          APP.showToast('Engine Pause command issued successfully.', 'success');
        }
      } catch (err) {
        APP.showToast(err.message || 'Failed to pause engine.', 'error');
        btnPause.disabled = false;
      }
    });

    btnStop.addEventListener('click', async () => {
      try {
        btnStop.disabled = true;
        const res = await API.stopEngine();
        if (res.success) {
          APP.showToast('Engine Stop command issued successfully.', 'success');
        }
      } catch (err) {
        APP.showToast(err.message || 'Failed to stop engine.', 'error');
        btnStop.disabled = false;
      }
    });

    btnRestart.addEventListener('click', async () => {
      try {
        btnRestart.disabled = true;
        const res = await API.restartEngine();
        if (res.success) {
          APP.showToast('Engine Restart command issued successfully.', 'success');
        }
      } catch (err) {
        APP.showToast(err.message || 'Failed to restart engine.', 'error');
        btnRestart.disabled = false;
      }
    });

    btnEmergency.addEventListener('click', async () => {
      if (confirm('🚨 WARNING: Are you sure you want to trigger EMERGENCY STOP? This will instantly cancel any pending orders and stop strategy execution.')) {
        try {
          btnEmergency.disabled = true;
          const res = await API.emergencyStop();
          if (res.success) {
            APP.showToast('🚨 EMERGENCY STOP triggered successfully.', 'success');
          }
        } catch (err) {
          APP.showToast(err.message || 'Failed to trigger emergency stop.', 'error');
          btnEmergency.disabled = false;
        }
      }
    });

    // 2. Fetch Dashboard metrics
    try {
      const summaryRes = await API.getSummary();
      if (summaryRes && summaryRes.success) {
        const metrics = summaryRes.data;
        window.Store.dashboard = metrics;

        // Render metrics replacing Skeletons
        document.getElementById('card-balance').innerHTML = `<h3>Balance</h3><div class="value">$${metrics.balance.toFixed(2)}</div>`;
        document.getElementById('card-equity').innerHTML = `<h3>Equity</h3><div class="value">$${metrics.equity.toFixed(2)}</div>`;
        
        const profitSign = metrics.dailyProfit >= 0 ? '+' : '';
        const profitColor = metrics.dailyProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
        document.getElementById('card-profit').innerHTML = `<h3>Today's Profit</h3><div class="value" style="color: ${profitColor};">${profitSign}$${metrics.dailyProfit.toFixed(2)}</div>`;
        
        document.getElementById('card-winrate').innerHTML = `<h3>Win Rate</h3><div class="value">${metrics.winRate.toFixed(1)}%</div>`;
      }

      // 3. Fetch Active Trades
      const activeRes = await API.getActiveTrades();
      if (activeRes && activeRes.success) {
        const trades = activeRes.data;
        window.Store.activeTrades = trades;

        const listContainer = document.getElementById('active-trades-list');
        if (trades.length === 0) {
          listContainer.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-text-secondary);">No open positions active.</td></tr>';
        } else {
          listContainer.innerHTML = trades.map((trade) => `
            <tr>
              <td style="font-weight: 600;">#${trade.mt5Ticket}</td>
              <td style="color: ${trade.orderType === 'BUY' ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight: 600;">${trade.orderType}</td>
              <td>${trade.lotSize.toFixed(2)}</td>
              <td>$${trade.entryPrice.toFixed(2)}</td>
              <td><span class="status-dot online" style="display: inline-block;"></span> Open</td>
              <td>
                <button class="btn btn-close-trade" data-ticket="${trade.mt5Ticket}" style="background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid rgba(239,68,68,0.4); padding: 0.25rem 0.6rem; font-size: 0.78rem; border-radius: 4px; cursor: pointer;">
                  🔴 Close Trade
                </button>
              </td>
            </tr>
          `).join('');
        }

        // Modal Action Listener
        const dashModal = document.getElementById('dash-manual-close-modal');
        const dashModalCancel = document.getElementById('dash-close-modal-cancel-btn');
        const dashModalConfirm = document.getElementById('dash-close-modal-confirm-btn');
        const dashModalTicketStr = document.getElementById('dash-close-modal-ticket-str');
        let dashTargetTicketToClose = null;

        listContainer.addEventListener('click', (e) => {
          const closeBtn = e.target.closest('.btn-close-trade');
          if (closeBtn) {
            dashTargetTicketToClose = closeBtn.dataset.ticket;
            dashModalTicketStr.innerText = `#${dashTargetTicketToClose}`;
            dashModal.style.display = 'flex';
          }
        });

        dashModalCancel.addEventListener('click', () => {
          dashModal.style.display = 'none';
          dashTargetTicketToClose = null;
        });

        dashModalConfirm.addEventListener('click', async () => {
          if (!dashTargetTicketToClose) return;
          dashModalConfirm.disabled = true;
          dashModalConfirm.innerText = 'Closing...';

          try {
            const res = await API.manualCloseTrade(dashTargetTicketToClose);
            if (res && res.success) {
              APP.showToast(`Trade #${dashTargetTicketToClose} closed manually!`, 'success');
            }
          } catch (err) {
            APP.showToast(err.message || 'Failed to close trade manually', 'error');
          } finally {
            dashModal.style.display = 'none';
            dashModalConfirm.disabled = false;
            dashModalConfirm.innerText = 'Yes, Close Trade';
            dashTargetTicketToClose = null;
            // Reload active positions
            const freshActive = await API.getActiveTrades();
            if (freshActive && freshActive.success) {
              const freshTrades = freshActive.data;
              if (freshTrades.length === 0) {
                listContainer.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-text-secondary);">No open positions active.</td></tr>';
              }
            }
          }
        });
      }

      // 4. Fetch Reports (for charting)
      const reportsRes = await API.getReports(1, 10);
      let labels = [];
      let dataPoints = [];

      if (reportsRes && reportsRes.success && reportsRes.data.length > 0) {
        const list = [...reportsRes.data].reverse();
        labels = list.map((item) => new Date(item.reportDate).toLocaleDateString());
        
        // Sum total net profit from the list to determine starting balance
        const totalNetProfit = list.reduce((sum, item) => sum + item.netProfit, 0);
        let cumulative = (window.Store.dashboard?.balance || 0.0) - totalNetProfit;
        
        dataPoints = list.map((item) => {
          cumulative += item.netProfit;
          return cumulative;
        });
      } else {
        // If no trading reports exist yet, show a flat line of their current balance
        const currentBalance = window.Store.dashboard?.balance || 0.0;
        labels = ['Initial', 'Current'];
        dataPoints = [currentBalance, currentBalance];
      }

      // 5. Render Chart.js Line Graph
      const ctx = document.getElementById('equity-chart');
      if (ctx) {
        new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'Account Equity ($)',
              data: dataPoints,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.3,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false,
              }
            },
            scales: {
              x: {
                grid: { color: 'rgba(51, 65, 85, 0.5)' },
                ticks: { color: '#94a3b8' }
              },
              y: {
                grid: { color: 'rgba(51, 65, 85, 0.5)' },
                ticks: { color: '#94a3b8' }
              }
            }
          }
        });
      }

    } catch (error) {
      console.error('Failed to load Dashboard data:', error);
    }
  }
};
