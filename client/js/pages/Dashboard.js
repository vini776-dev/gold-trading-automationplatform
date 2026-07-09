import { API } from '../api.js';

export const DashboardPage = {
  render: () => {
    return `
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
                </tr>
              </thead>
              <tbody id="active-trades-list">
                <tr>
                  <td colspan="5" class="shimmer skeleton-text" style="height: 3rem;"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  onMount: async () => {
    try {
      // 1. Fetch Dashboard metrics
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

      // 2. Fetch Active Trades
      const activeRes = await API.getActiveTrades();
      if (activeRes && activeRes.success) {
        const trades = activeRes.data;
        window.Store.activeTrades = trades;

        const listContainer = document.getElementById('active-trades-list');
        if (trades.length === 0) {
          listContainer.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--color-text-secondary);">No open positions active.</td></tr>';
        } else {
          listContainer.innerHTML = trades.map((trade) => `
            <tr>
              <td style="font-weight: 600;">#${trade.mt5Ticket}</td>
              <td style="color: ${trade.orderType === 'BUY' ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight: 600;">${trade.orderType}</td>
              <td>${trade.lotSize.toFixed(2)}</td>
              <td>$${trade.entryPrice.toFixed(2)}</td>
              <td><span class="status-dot online" style="display: inline-block;"></span> Open</td>
            </tr>
          `).join('');
        }
      }

      // 3. Fetch Reports (for charting)
      const reportsRes = await API.getReports(1, 10);
      let labels = [];
      let dataPoints = [];

      if (reportsRes && reportsRes.success && reportsRes.data.length > 0) {
        // Reverse array to show chronological timeline order
        const list = [...reportsRes.data].reverse();
        labels = list.map((item) => new Date(item.reportDate).toLocaleDateString());
        // Calculate cumulative equity points starting from 10,000.00
        let cumulative = 10000.00;
        dataPoints = list.map((item) => {
          cumulative += item.netProfit;
          return cumulative;
        });
      } else {
        // Mock fallback placeholders for initial display
        labels = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'];
        dataPoints = [10000.0, 10050.0, 10020.0, 10150.0, 10250.0];
      }

      // 4. Render Chart.js Line Graph
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
