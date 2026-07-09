import { API } from '../api.js';

let currentPage = 1;
const limit = 10;

export const ReportsPage = {
  render: () => {
    return `
      <!-- Performance Analytics Cards -->
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

      <!-- Historical Reports List -->
      <div class="card">
        <h3 style="margin-bottom: 1.5rem; font-weight: 600;">Performance History</h3>
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Total Trades</th>
                <th>Wins</th>
                <th>Losses</th>
                <th>Win Rate</th>
                <th>Net Profit ($)</th>
                <th>Max Drawdown (%)</th>
              </tr>
            </thead>
            <tbody id="page-reports-list">
              <tr>
                <td colspan="8" class="shimmer skeleton-text" style="height: 3rem;"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem;">
          <button id="reports-prev-btn" class="btn btn-primary" style="padding: 0.5rem 1rem;" disabled>
            <i class="fa-solid fa-angle-left" style="margin-right: 0.25rem;"></i> Previous
          </button>
          <span style="font-weight: 600; color: var(--color-text-secondary);">Page <span id="reports-page-num">${currentPage}</span></span>
          <button id="reports-next-btn" class="btn btn-primary" style="padding: 0.5rem 1rem;">
            Next <i class="fa-solid fa-angle-right" style="margin-left: 0.25rem;"></i>
          </button>
        </div>
      </div>
    `;
  },

  onMount: async () => {
    try {
      await ReportsPage.loadReports();

      // Bind Pagination
      const prevBtn = document.getElementById('reports-prev-btn');
      const nextBtn = document.getElementById('reports-next-btn');

      prevBtn.addEventListener('click', async () => {
        if (currentPage > 1) {
          currentPage -= 1;
          await ReportsPage.loadReports();
        }
      });

      nextBtn.addEventListener('click', async () => {
        currentPage += 1;
        await ReportsPage.loadReports();
      });

    } catch (error) {
      console.error('Failed to load Reports Page:', error);
    }
  },

  loadReports: async () => {
    const listContainer = document.getElementById('page-reports-list');
    listContainer.innerHTML = '<tr><td colspan="8" class="shimmer skeleton-text" style="height: 3rem;"></td></tr>';

    try {
      const reportsRes = await API.getReports(currentPage, limit);
      if (reportsRes && reportsRes.success) {
        const { data, total } = reportsRes;

        // Update pagination numbers
        document.getElementById('reports-page-num').innerText = currentPage;

        const prevBtn = document.getElementById('reports-prev-btn');
        const nextBtn = document.getElementById('reports-next-btn');
        
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage * limit >= total;

        if (data.length === 0) {
          listContainer.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--color-text-secondary);">No reports generated yet.</td></tr>';
          
          // Set placeholders for analytics cards
          document.getElementById('report-profit-factor').innerHTML = '<h3>Profit Factor</h3><div class="value">0.00</div>';
          document.getElementById('report-expectancy').innerHTML = '<h3>Expectancy</h3><div class="value">$0.00</div>';
          document.getElementById('report-avg-win').innerHTML = '<h3>Avg Win</h3><div class="value">$0.00</div>';
          document.getElementById('report-avg-loss').innerHTML = '<h3>Avg Loss</h3><div class="value">$0.00</div>';
        } else {
          // Render Analytics Metrics from the latest report
          const latest = data[0];
          document.getElementById('report-profit-factor').innerHTML = `<h3>Profit Factor</h3><div class="value">${(latest.profitFactor || 0).toFixed(2)}</div>`;
          
          const expColor = (latest.expectancy || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
          document.getElementById('report-expectancy').innerHTML = `<h3>Expectancy</h3><div class="value" style="color: ${expColor};">$${(latest.expectancy || 0).toFixed(2)}</div>`;
          
          document.getElementById('report-avg-win').innerHTML = `<h3>Avg Win</h3><div class="value" style="color: var(--color-success);">$${(latest.averageWin || 0).toFixed(2)}</div>`;
          document.getElementById('report-avg-loss').innerHTML = `<h3>Avg Loss</h3><div class="value" style="color: var(--color-danger);">$${(latest.averageLoss || 0).toFixed(2)}</div>`;

          // Render list
          listContainer.innerHTML = data.map((report) => {
            const pnl = report.netProfit || 0;
            const pnlColor = pnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
            const pnlSign = pnl >= 0 ? '+' : '';

            return `
              <tr>
                <td style="font-weight: 600;">${new Date(report.reportDate).toLocaleDateString()}</td>
                <td><span style="font-weight: 500;">${report.reportType}</span></td>
                <td>${report.totalTrades}</td>
                <td>${report.winningTrades}</td>
                <td>${report.losingTrades}</td>
                <td>${report.winRate.toFixed(1)}%</td>
                <td style="color: ${pnlColor}; font-weight: 600;">${pnlSign}$${pnl.toFixed(2)}</td>
                <td>${report.drawdown.toFixed(2)}%</td>
              </tr>
            `;
          }).join('');
        }
      }
    } catch (err) {
      console.error('Failed to load reports history:', err);
      listContainer.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--color-danger);">Failed to load performance metrics.</td></tr>';
    }
  }
};
