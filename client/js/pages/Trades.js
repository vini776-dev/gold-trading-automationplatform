import { API } from '../api.js';

let currentPage = 1;
const limit = 10;

export const TradesPage = {
  render: () => {
    return `
      <!-- Active Positions Card -->
      <div class="card">
        <h3 style="margin-bottom: 1.5rem; font-weight: 600;">Active Trades</h3>
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Symbol</th>
                <th>Type</th>
                <th>Lot</th>
                <th>Entry Price</th>
                <th>SL</th>
                <th>TP</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="page-active-trades-list">
              <tr>
                <td colspan="8" class="shimmer skeleton-text" style="height: 3rem;"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Trade History Card -->
      <div class="card">
        <h3 style="margin-bottom: 1.5rem; font-weight: 600;">Trade History</h3>
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Symbol</th>
                <th>Type</th>
                <th>Lot</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>P&L ($)</th>
                <th>Open Time</th>
                <th>Close Time</th>
                <th>Close Reason</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody id="page-history-trades-list">
              <tr>
                <td colspan="11" class="shimmer skeleton-text" style="height: 3rem;"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem;">
          <button id="history-prev-btn" class="btn btn-primary" style="padding: 0.5rem 1rem;" disabled>
            <i class="fa-solid fa-angle-left" style="margin-right: 0.25rem;"></i> Previous
          </button>
          <span style="font-weight: 600; color: var(--color-text-secondary);">Page <span id="current-page-num">${currentPage}</span></span>
          <button id="history-next-btn" class="btn btn-primary" style="padding: 0.5rem 1rem;">
            Next <i class="fa-solid fa-angle-right" style="margin-left: 0.25rem;"></i>
          </button>
        </div>
      </div>
    `;
  },

  onMount: async () => {
    try {
      // 1. Fetch Active Trades
      const activeRes = await API.getActiveTrades();
      if (activeRes && activeRes.success) {
        const trades = activeRes.data;
        const listContainer = document.getElementById('page-active-trades-list');

        if (trades.length === 0) {
          listContainer.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--color-text-secondary);">No active trades open.</td></tr>';
        } else {
          listContainer.innerHTML = trades.map((trade) => `
            <tr>
              <td style="font-weight: 600;">#${trade.mt5Ticket}</td>
              <td>${trade.symbol}</td>
              <td style="color: ${trade.orderType === 'BUY' ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight: 600;">${trade.orderType}</td>
              <td>${trade.lotSize.toFixed(2)}</td>
              <td>$${trade.entryPrice.toFixed(2)}</td>
              <td>$${(trade.stopLoss || 0).toFixed(2)}</td>
              <td>$${(trade.takeProfit || 0).toFixed(2)}</td>
              <td><span class="status-dot online" style="display: inline-block;"></span> Active</td>
            </tr>
          `).join('');
        }
      }

      // 2. Fetch Trade History
      await TradesPage.loadHistory();

      // Bind Pagination Actions
      const prevBtn = document.getElementById('history-prev-btn');
      const nextBtn = document.getElementById('history-next-btn');

      prevBtn.addEventListener('click', async () => {
        if (currentPage > 1) {
          currentPage -= 1;
          await TradesPage.loadHistory();
        }
      });

      nextBtn.addEventListener('click', async () => {
        currentPage += 1;
        await TradesPage.loadHistory();
      });

    } catch (error) {
      console.error('Failed to load Trades Page:', error);
    }
  },

  loadHistory: async () => {
    const listContainer = document.getElementById('page-history-trades-list');
    listContainer.innerHTML = '<tr><td colspan="11" class="shimmer skeleton-text" style="height: 3rem;"></td></tr>';

    try {
      const historyRes = await API.getTradeHistory(currentPage, limit);
      if (historyRes && historyRes.success) {
        const { data, total } = historyRes;
        
        // Update pagination numbers
        document.getElementById('current-page-num').innerText = currentPage;
        
        const prevBtn = document.getElementById('history-prev-btn');
        const nextBtn = document.getElementById('history-next-btn');
        
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage * limit >= total;

        if (data.length === 0) {
          listContainer.innerHTML = '<tr><td colspan="11" style="text-align: center; color: var(--color-text-secondary);">No trade history recorded yet.</td></tr>';
        } else {
          listContainer.innerHTML = data.map((trade) => {
            const pnl = trade.profitLoss || 0;
            const pnlColor = pnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
            const pnlSign = pnl >= 0 ? '+' : '';
            
            // Format duration
            const durationMins = Math.floor((trade.duration || 0) / 60);
            const durationSecs = (trade.duration || 0) % 60;
            const durationStr = `${durationMins}m ${durationSecs}s`;

            // Format open and close times (IST)
            const fmtTime = (iso) => {
              if (!iso) return '—';
              const d = new Date(iso);
              return d.toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: true, timeZone: 'Asia/Kolkata'
              });
            };

            return `
              <tr>
                <td style="font-weight: 600;">#${trade.mt5Ticket}</td>
                <td>${trade.symbol}</td>
                <td style="color: ${trade.orderType === 'BUY' ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight: 600;">${trade.orderType}</td>
                <td>${trade.lotSize.toFixed(2)}</td>
                <td>$${trade.entryPrice.toFixed(2)}</td>
                <td>$${(trade.exitPrice || 0).toFixed(2)}</td>
                <td style="color: ${pnlColor}; font-weight: 600;">${pnlSign}$${pnl.toFixed(2)}</td>
                <td style="font-size: 0.78rem; color: var(--color-text-secondary);">${fmtTime(trade.openTime)}</td>
                <td style="font-size: 0.78rem; color: var(--color-text-secondary);">${fmtTime(trade.closeTime)}</td>
                <td><span style="font-weight: 500;">${trade.closeReason || 'Manual'}</span></td>
                <td>${durationStr}</td>
              </tr>
            `;
          }).join('');
        }
      }
    } catch (err) {
      console.error('Failed to load history batch:', err);
      listContainer.innerHTML = '<tr><td colspan="11" style="text-align: center; color: var(--color-danger);">Failed to load history data.</td></tr>';
    }
  }
};
