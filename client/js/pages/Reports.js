import { API } from '../api.js';
import { APP } from '../app.js';

let currentPage = 1;
const limit = 10;
let activeTab = 'backtest'; // 'backtest' or 'daily'

export const ReportsPage = {
  render: () => {
    return `
      <!-- Backtesting Control Panel -->
      <div class="card" style="margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
          <h3 style="margin: 0; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
            <i class="fa-solid fa-flask" style="color: var(--color-primary);"></i>
            Backtest & Strategy Simulation
          </h3>
          <button id="btn-run-backtest" class="btn btn-primary" style="padding: 0.5rem 1.25rem; font-weight: 600;">
            <i class="fa-solid fa-play" style="margin-right: 0.4rem;"></i> Run New Backtest
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; font-size: 0.88rem; background: var(--color-bg-primary); padding: 1rem; border-radius: 8px; border: 1px solid var(--color-border);">
          <div>
            <label style="color: var(--color-text-muted); display: block; margin-bottom: 0.3rem;">Testing Period</label>
            <select id="backtest-period" style="width: 100%; padding: 0.4rem 0.6rem; border-radius: 4px; background: var(--color-bg-secondary); color: #fff; border: 1px solid var(--color-border);">
              <option value="1M">1 Month (30 Days)</option>
              <option value="3M">3 Months (90 Days)</option>
              <option value="6M">6 Months (180 Days)</option>
              <option value="1Y">1 Year (365 Days)</option>
            </select>
          </div>
          <div>
            <label style="color: var(--color-text-muted); display: block; margin-bottom: 0.3rem;">Initial Balance ($)</label>
            <input type="number" id="backtest-balance" value="10000" style="width: 100%; padding: 0.4rem 0.6rem; border-radius: 4px; background: var(--color-bg-secondary); color: #fff; border: 1px solid var(--color-border);">
          </div>
          <div>
            <label style="color: var(--color-text-muted); display: block; margin-bottom: 0.3rem;">Lot Size</label>
            <input type="number" id="backtest-lot" step="0.01" value="0.20" style="width: 100%; padding: 0.4rem 0.6rem; border-radius: 4px; background: var(--color-bg-secondary); color: #fff; border: 1px solid var(--color-border);">
          </div>
          <div>
            <label style="color: var(--color-text-muted); display: block; margin-bottom: 0.3rem;">Risk Reward</label>
            <input type="text" id="backtest-rr" value="1:2" style="width: 100%; padding: 0.4rem 0.6rem; border-radius: 4px; background: var(--color-bg-secondary); color: #fff; border: 1px solid var(--color-border);">
          </div>
        </div>
      </div>

      <!-- Performance Analytics Metric Cards -->
      <div class="metric-grid">
        <div class="stat-card" id="report-profit-factor">
          <h3>Profit Factor</h3>
          <div class="value shimmer skeleton-value"></div>
        </div>
        <div class="stat-card" id="report-expectancy">
          <h3>Expectancy</h3>
          <div class="value shimmer skeleton-value"></div>
        </div>
        <div class="stat-card" id="report-avg-win">
          <h3>Avg Win</h3>
          <div class="value shimmer skeleton-value"></div>
        </div>
        <div class="stat-card" id="report-avg-loss">
          <h3>Avg Loss</h3>
          <div class="value shimmer skeleton-value"></div>
        </div>
      </div>

      <!-- Tab Switcher & Saved Backtests Table -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; gap: 0.5rem; background: var(--color-bg-primary); padding: 4px; border-radius: 6px; border: 1px solid var(--color-border);">
            <button id="tab-btn-backtests" class="btn" style="background: var(--color-primary); color: #fff; padding: 0.4rem 1rem; font-size: 0.85rem;">Saved Backtests</button>
            <button id="tab-btn-daily" class="btn" style="background: transparent; color: var(--color-text-secondary); padding: 0.4rem 1rem; font-size: 0.85rem;">Daily Live Reports</button>
          </div>

          <button id="btn-compare-selected" class="btn" style="background: rgba(167,139,250,0.15); color: #a78bfa; border: 1px solid rgba(167,139,250,0.4); padding: 0.4rem 0.9rem; font-size: 0.85rem; font-weight: 600;">
            <i class="fa-solid fa-code-compare" style="margin-right: 0.4rem;"></i> Compare Selected (<span id="compare-count">0</span>)
          </button>
        </div>

        <div class="table-container">
          <table class="table">
            <thead>
              <tr id="reports-table-header">
                <th style="width: 40px; text-align: center;"><input type="checkbox" id="select-all-backtests"></th>
                <th>Date</th>
                <th>Strategy / Period</th>
                <th>Total Trades</th>
                <th>Win Rate</th>
                <th>Net Profit ($)</th>
                <th>Profit Factor</th>
                <th>Max DD (%)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="page-reports-list">
              <tr><td colspan="9" class="shimmer skeleton-text" style="height: 3rem;"></td></tr>
            </tbody>
          </table>
        </div>

        <!-- Backtest Details Modal / Accordion Drawer -->
        <div id="backtest-trades-drawer" style="display: none; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--color-border);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h4 style="margin: 0; font-weight: 600;" id="drawer-title">Backtest Trade Details</h4>
            <button id="drawer-close-btn" class="btn" style="background: transparent; color: var(--color-text-muted);"><i class="fa-solid fa-xmark"></i> Close</button>
          </div>
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Type</th>
                  <th>Lot</th>
                  <th>Entry Price</th>
                  <th>Exit Price</th>
                  <th>P&L ($)</th>
                  <th>Exit Reason</th>
                  <th>Replay Action</th>
                </tr>
              </thead>
              <tbody id="drawer-trades-list">
                <!-- Dynamically filled -->
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  },

  onMount: async () => {
    const runBtn = document.getElementById('btn-run-backtest');
    const compareBtn = document.getElementById('btn-compare-selected');
    const tabBacktests = document.getElementById('tab-btn-backtests');
    const tabDaily = document.getElementById('tab-btn-daily');

    tabBacktests.addEventListener('click', async () => {
      activeTab = 'backtest';
      tabBacktests.style.backgroundColor = 'var(--color-primary)';
      tabBacktests.style.color = '#fff';
      tabDaily.style.backgroundColor = 'transparent';
      tabDaily.style.color = 'var(--color-text-secondary)';
      await ReportsPage.loadReports();
    });

    tabDaily.addEventListener('click', async () => {
      activeTab = 'daily';
      tabDaily.style.backgroundColor = 'var(--color-primary)';
      tabDaily.style.color = '#fff';
      tabBacktests.style.backgroundColor = 'transparent';
      tabBacktests.style.color = 'var(--color-text-secondary)';
      await ReportsPage.loadReports();
    });

    runBtn.addEventListener('click', async () => {
      const period = document.getElementById('backtest-period').value;
      const initial_balance = parseFloat(document.getElementById('backtest-balance').value);
      const lot_size = parseFloat(document.getElementById('backtest-lot').value);
      const risk_reward = document.getElementById('backtest-rr').value;

      try {
        runBtn.disabled = true;
        runBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right: 0.4rem;"></i> Simulating...';

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Simulation request timed out. Please try again.')), 10000)
        );

        const res = await Promise.race([
          API.runBacktest({
            symbol: 'XAUUSD',
            period,
            initial_balance,
            lot_size,
            risk_reward
          }),
          timeoutPromise
        ]);

        if (res && res.success) {
          const report = res.data;
          APP.showToast(`Backtest completed! Net Profit: $${report.netProfit}`, 'success');
          await ReportsPage.loadReports();

          // Requirement 5: Auto-open Trade Replay for the first trade of newly generated backtest
          if (report && report.trades && report.trades.length > 0) {
            const firstTradeId = report.trades[0]._id || report.trades[0].ticket;
            setTimeout(() => {
              window.location.hash = `#/replay?tradeId=${firstTradeId}`;
            }, 800);
          }
        }
      } catch (err) {
        console.error('[Reports] Backtest error:', err);
        APP.showToast(err.message || 'Backtest simulation failed', 'error');
      } finally {
        runBtn.disabled = false;
        runBtn.innerHTML = '<i class="fa-solid fa-play" style="margin-right: 0.4rem;"></i> Run New Backtest';
      }
    });

    // Handle Compare selection
    compareBtn.addEventListener('click', () => {
      const checkedBoxes = document.querySelectorAll('.backtest-checkbox:checked');
      const selectedIds = Array.from(checkedBoxes).map(b => b.dataset.id);

      if (selectedIds.length === 0) {
        APP.showToast('Please select at least one backtest report using checkboxes', 'warning');
        return;
      }
      window.location.hash = `#/backtest-compare?ids=${selectedIds.join(',')}`;
    });

    document.getElementById('drawer-close-btn').addEventListener('click', () => {
      document.getElementById('backtest-trades-drawer').style.display = 'none';
    });

    await ReportsPage.loadReports();
  },

  loadReports: async () => {
    const listContainer = document.getElementById('page-reports-list');
    listContainer.innerHTML = '<tr><td colspan="9" class="shimmer skeleton-text" style="height: 3rem;"></td></tr>';

    try {
      if (activeTab === 'backtest') {
        const res = await API.getBacktestReports(1, 20);
        if (res && res.success) {
          const rawData = res.data;
          const reports = Array.isArray(rawData) ? rawData : (rawData && Array.isArray(rawData.data) ? rawData.data : []);

          if (reports.length === 0) {
            document.getElementById('report-profit-factor').innerHTML = `<h3>Profit Factor</h3><div class="value" style="color: var(--color-text-secondary);">0.00</div>`;
            document.getElementById('report-expectancy').innerHTML = `<h3>Expectancy</h3><div class="value" style="color: var(--color-text-secondary);">$0.00</div>`;
            document.getElementById('report-avg-win').innerHTML = `<h3>Avg Win</h3><div class="value" style="color: var(--color-success);">$0.00</div>`;
            document.getElementById('report-avg-loss').innerHTML = `<h3>Avg Loss</h3><div class="value" style="color: var(--color-danger);">$0.00</div>`;
            listContainer.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--color-text-secondary); padding: 2rem;">No saved backtests found. Click <strong>"Run New Backtest"</strong> above to generate your first strategy simulation report.</td></tr>';
          } else {
            const latest = reports[0];
            const pfVal = Number(latest.profitFactor || 0).toFixed(2);
            const expVal = Number(latest.expectancy || 0).toFixed(2);
            const avgWinVal = Number(latest.averageWin || 0).toFixed(2);
            const avgLossVal = Number(latest.averageLoss || 0).toFixed(2);

            document.getElementById('report-profit-factor').innerHTML = `<h3>Profit Factor</h3><div class="value">${pfVal}</div>`;
            const expColor = (latest.expectancy || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
            document.getElementById('report-expectancy').innerHTML = `<h3>Expectancy</h3><div class="value" style="color: ${expColor};">$${expVal}</div>`;
            document.getElementById('report-avg-win').innerHTML = `<h3>Avg Win</h3><div class="value" style="color: var(--color-success);">$${avgWinVal}</div>`;
            document.getElementById('report-avg-loss').innerHTML = `<h3>Avg Loss</h3><div class="value" style="color: var(--color-danger);">$${avgLossVal}</div>`;

            listContainer.innerHTML = reports.map((r) => {
              const pnl = Number(r.netProfit || 0);
              const pnlColor = pnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
              const pnlSign = pnl >= 0 ? '+' : '';
              const winRateNum = Number(r.winRate || 0).toFixed(1);
              const pfNum = Number(r.profitFactor || 0).toFixed(2);
              const ddNum = Number(r.maxDrawdown || 0).toFixed(2);
              const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString() : new Date().toLocaleDateString();

              return `
                <tr>
                  <td style="text-align: center;"><input type="checkbox" class="backtest-checkbox" data-id="${r._id}"></td>
                  <td style="font-weight: 600;">${dateStr}</td>
                  <td>${r.strategyVersion || 'EMA Engulfing (V1)'} (${r.period || '1M'})</td>
                  <td>${r.totalTrades || 0}</td>
                  <td><strong style="color: #3b82f6;">${winRateNum}%</strong></td>
                  <td style="color: ${pnlColor}; font-weight: 600;">${pnlSign}$${pnl.toFixed(2)}</td>
                  <td>${pfNum}</td>
                  <td>${ddNum}%</td>
                  <td>
                    <button class="btn btn-view-trades" data-id="${r._id}" style="background: rgba(59,130,246,0.15); color: #3b82f6; border: 1px solid rgba(59,130,246,0.3); padding: 0.25rem 0.6rem; font-size: 0.78rem; border-radius: 4px; cursor: pointer;">
                      <i class="fa-solid fa-list-check"></i> View Trades (${r.trades ? r.trades.length : 0})
                    </button>
                  </td>
                </tr>
              `;
            }).join('');

            // Bind checkbox counter & View Trades drawer click listeners
            document.querySelectorAll('.backtest-checkbox').forEach(box => {
              box.addEventListener('change', () => {
                const count = document.querySelectorAll('.backtest-checkbox:checked').length;
                document.getElementById('compare-count').innerText = count;
              });
            });

            document.querySelectorAll('.btn-view-trades').forEach(btn => {
              btn.addEventListener('click', async () => {
                const repId = btn.dataset.id;
                const rep = reports.find(r => r._id === repId);
                if (rep && rep.trades) {
                  document.getElementById('drawer-title').innerText = `Backtest #${rep._id.slice(-6)} Trades (${rep.period || '1M'} Period)`;
                  const drawerList = document.getElementById('drawer-trades-list');
                  
                  drawerList.innerHTML = rep.trades.map((t) => {
                    const tpnl = t.profitLoss || 0;
                    const tpnlColor = tpnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
                    const tpnlSign = tpnl >= 0 ? '+' : '';

                    return `
                      <tr>
                        <td style="font-weight: 600;">#${t.ticket}</td>
                        <td style="color: ${t.orderType === 'BUY' ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight: 600;">${t.orderType}</td>
                        <td>${t.lotSize.toFixed(2)}</td>
                        <td>$${t.entryPrice.toFixed(2)}</td>
                        <td>$${(t.exitPrice || 0).toFixed(2)}</td>
                        <td style="color: ${tpnlColor}; font-weight: 600;">${tpnlSign}$${tpnl.toFixed(2)}</td>
                        <td>${t.closeReason}</td>
                        <td>
                          <a href="#/replay?tradeId=${t._id || t.ticket}" class="btn" style="background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); padding: 0.25rem 0.6rem; font-size: 0.78rem; border-radius: 4px; text-decoration: none; display: inline-flex; align-items: center; gap: 0.25rem;">
                            <i class="fa-solid fa-film"></i> ▶ Replay Trade
                          </a>
                        </td>
                      </tr>
                    `;
                  }).join('');

                  document.getElementById('backtest-trades-drawer').style.display = 'block';
                }
              });
            });

          }
        }
      } else {
        // Daily Reports Tab
        const reportsRes = await API.getReports(1, 20);
        if (reportsRes && reportsRes.success) {
          const data = reportsRes.data;
          if (data.length === 0) {
            listContainer.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--color-text-secondary);">No daily reports generated yet.</td></tr>';
          } else {
            listContainer.innerHTML = data.map((report) => `
              <tr>
                <td>—</td>
                <td style="font-weight: 600;">${new Date(report.reportDate).toLocaleDateString()}</td>
                <td>Daily Live Report</td>
                <td>${report.totalTrades}</td>
                <td><strong style="color: #3b82f6;">${report.winRate.toFixed(1)}%</strong></td>
                <td style="color: ${report.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight: 600;">${report.netProfit >= 0 ? '+' : ''}$${report.netProfit.toFixed(2)}</td>
                <td>${(report.profitFactor || 0).toFixed(2)}</td>
                <td>${report.drawdown.toFixed(2)}%</td>
                <td>—</td>
              </tr>
            `).join('');
          }
        }
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  }
};
