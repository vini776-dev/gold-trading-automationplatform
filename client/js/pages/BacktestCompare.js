import { API } from '../api.js';
import { APP } from '../app.js';

export const BacktestComparePage = {
  render: () => {
    return `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        
        <!-- Header -->
        <div class="card" style="margin-bottom: 0; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <a href="#/reports" class="btn" style="background: rgba(255,255,255,0.08); color: #fff; padding: 0.4rem 0.8rem; font-size: 0.85rem;">
              <i class="fa-solid fa-arrow-left" style="margin-right: 0.4rem;"></i> Back to Reports
            </a>
            <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem;">
              <i class="fa-solid fa-code-compare" style="color: var(--color-primary);"></i>
              Backtest Performance Comparison
            </h3>
          </div>
        </div>

        <!-- Comparative Multi-Line Equity Curve Chart -->
        <div class="card" style="margin-bottom: 0;">
          <h4 style="margin-bottom: 1.25rem; font-weight: 600;">Comparative Equity Curves</h4>
          <div style="position: relative; height: 350px; width: 100%;">
            <canvas id="compare-equity-chart"></canvas>
          </div>
        </div>

        <!-- Side-by-Side Metrics Table -->
        <div class="card" style="margin-bottom: 0;">
          <h4 style="margin-bottom: 1.25rem; font-weight: 600;">Metrics Comparison Table</h4>
          <div class="table-container">
            <table class="table" id="compare-metrics-table">
              <thead>
                <tr id="compare-table-header">
                  <th>Metric</th>
                  <!-- Dynamic Columns for each report -->
                </tr>
              </thead>
              <tbody id="compare-table-body">
                <tr><td colspan="5" class="shimmer skeleton-text" style="height: 3rem;"></td></tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  },

  onMount: async () => {
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
    const idsParam = urlParams.get('ids');

    if (!idsParam) {
      APP.showToast('Please select at least one backtest report to compare', 'warning');
      window.location.hash = '#/reports';
      return;
    }

    const ids = idsParam.split(',');
    try {
      const response = await API.compareBacktests(ids);
      if (!response || !response.success || !response.data || response.data.length === 0) {
        APP.showToast('Failed to load comparison data', 'error');
        return;
      }

      const reports = response.data;
      BacktestComparePage.renderComparisonTable(reports);
      BacktestComparePage.renderEquityChart(reports);

    } catch (err) {
      console.error('Failed to load comparison:', err);
      APP.showToast(err.message || 'Failed to compare backtest reports', 'error');
    }
  },

  renderComparisonTable: (reports) => {
    const headerEl = document.getElementById('compare-table-header');
    const bodyEl = document.getElementById('compare-table-body');

    headerEl.innerHTML = `<th>Metric</th>` + reports.map((r, idx) => `
      <th style="text-align: center; color: var(--color-primary);">
        Report #${idx + 1} (${r.period || '1M'})<br>
        <span style="font-size: 0.75rem; color: var(--color-text-muted);">${new Date(r.createdAt).toLocaleDateString()}</span>
      </th>
    `).join('');

    const metricsList = [
      { key: 'strategyVersion', label: 'Strategy Version', fmt: (v) => v },
      { key: 'period', label: 'Testing Period', fmt: (v) => v || '1M' },
      { key: 'symbol', label: 'Symbol / Timeframe', fmt: (v, r) => `${r.symbol || 'XAUUSD'} (${r.timeframe || 'M5'})` },
      { key: 'netProfit', label: 'Net Profit ($)', fmt: (v) => `<span style="color: ${v >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight: 700;">${v >= 0 ? '+' : ''}$${v.toFixed(2)}</span>` },
      { key: 'winRate', label: 'Win Rate (%)', fmt: (v) => `<strong style="color: #3b82f6;">${v.toFixed(1)}%</strong>` },
      { key: 'profitFactor', label: 'Profit Factor', fmt: (v) => v.toFixed(2) },
      { key: 'maxDrawdown', label: 'Max Drawdown (%)', fmt: (v) => `<span style="color: var(--color-warning);">${v.toFixed(2)}%</span>` },
      { key: 'totalTrades', label: 'Total Trades', fmt: (v) => v },
      { key: 'winningTrades', label: 'Winning Trades', fmt: (v) => `<span style="color: var(--color-success);">${v}</span>` },
      { key: 'losingTrades', label: 'Losing Trades', fmt: (v) => `<span style="color: var(--color-danger);">${v}</span>` },
      { key: 'expectancy', label: 'Expectancy ($)', fmt: (v) => `$${v.toFixed(2)}` },
    ];

    bodyEl.innerHTML = metricsList.map((m) => `
      <tr>
        <td style="font-weight: 600; color: var(--color-text-secondary);">${m.label}</td>
        ${reports.map((r) => `<td style="text-align: center;">${m.fmt(r[m.key], r)}</td>`).join('')}
      </tr>
    `).join('');
  },

  renderEquityChart: (reports) => {
    const ctx = document.getElementById('compare-equity-chart');
    if (!ctx) return;

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#a78bfa', '#ef4444'];

    const datasets = reports.map((r, idx) => {
      const curve = r.equityCurve || [];
      const dataPoints = curve.map((c) => c.equity);
      return {
        label: `Report #${idx + 1} (${r.period || '1M'}) - ${r.strategyVersion}`,
        data: dataPoints,
        borderColor: colors[idx % colors.length],
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.3,
      };
    });

    const maxLen = Math.max(...reports.map((r) => (r.equityCurve || []).length));
    const labels = Array.from({ length: maxLen }, (_, i) => `Trade #${i + 1}`);

    new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#94a3b8' } }
        },
        scales: {
          x: { grid: { color: 'rgba(51,65,85,0.4)' }, ticks: { color: '#94a3b8' } },
          y: { grid: { color: 'rgba(51,65,85,0.4)' }, ticks: { color: '#94a3b8' } }
        }
      }
    });
  }
};
