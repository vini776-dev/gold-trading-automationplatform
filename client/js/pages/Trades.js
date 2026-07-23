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
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="page-active-trades-list">
              <tr>
                <td colspan="9" class="shimmer skeleton-text" style="height: 3rem;"></td>
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
                <th>Action</th>
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

      <!-- Manual Close Confirmation Modal -->
      <div id="manual-close-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9999; justify-content: center; align-items: center;">
        <div class="card" style="width: 400px; max-width: 90%; text-align: center; border: 1px solid var(--color-danger); padding: 2rem;">
          <div style="font-size: 2.5rem; color: var(--color-danger); margin-bottom: 1rem;"><i class="fa-solid fa-circle-exclamation"></i></div>
          <h3 style="margin-bottom: 0.5rem;">Close Position Manually?</h3>
          <p style="color: var(--color-text-secondary); margin-bottom: 1.5rem; font-size: 0.9rem;">
            Are you sure you want to close trade <strong id="close-modal-ticket-str">#—</strong> at current market price?
          </p>
          <div style="display: flex; gap: 1rem; justify-content: center;">
            <button id="close-modal-cancel-btn" class="btn" style="background: rgba(255,255,255,0.1); color: #fff;">Cancel</button>
            <button id="close-modal-confirm-btn" class="btn" style="background: var(--color-danger); color: #fff;">Yes, Close Trade</button>
          </div>
        </div>
      </div>
    `;
  },

  onMount: async () => {
    try {
      await TradesPage.loadActiveTrades();
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

      // Bind Active Trades Action Click (Close Trade)
      const activeContainer = document.getElementById('page-active-trades-list');
      let targetTicketToClose = null;

      const modal = document.getElementById('manual-close-modal');
      const modalCancel = document.getElementById('close-modal-cancel-btn');
      const modalConfirm = document.getElementById('close-modal-confirm-btn');
      const modalTicketStr = document.getElementById('close-modal-ticket-str');

      activeContainer.addEventListener('click', (e) => {
        const closeBtn = e.target.closest('.btn-close-trade');
        if (closeBtn) {
          targetTicketToClose = closeBtn.dataset.ticket;
          modalTicketStr.innerText = `#${targetTicketToClose}`;
          modal.style.display = 'flex';
        }
      });

      modalCancel.addEventListener('click', () => {
        modal.style.display = 'none';
        targetTicketToClose = null;
      });

      modalConfirm.addEventListener('click', async () => {
        if (!targetTicketToClose) return;
        modalConfirm.disabled = true;
        modalConfirm.innerText = 'Closing...';

        try {
          const res = await API.manualCloseTrade(targetTicketToClose);
          if (res && res.success) {
            window.Toast?.show(`Trade #${targetTicketToClose} closed manually!`, 'success');
          }
        } catch (err) {
          window.Toast?.show(err.message || 'Failed to close trade manually', 'error');
        } finally {
          modal.style.display = 'none';
          modalConfirm.disabled = false;
          modalConfirm.innerText = 'Yes, Close Trade';
          targetTicketToClose = null;
          await TradesPage.loadActiveTrades();
          await TradesPage.loadHistory();
        }
      });

    } catch (error) {
      console.error('Failed to load Trades Page:', error);
    }
  },

  loadActiveTrades: async () => {
    const listContainer = document.getElementById('page-active-trades-list');
    const activeRes = await API.getActiveTrades();
    if (activeRes && activeRes.success) {
      const trades = activeRes.data;
      if (trades.length === 0) {
        listContainer.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--color-text-secondary);">No active trades open.</td></tr>';
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
            <td>
              <button class="btn btn-close-trade" data-ticket="${trade.mt5Ticket}" style="background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid rgba(239,68,68,0.4); padding: 0.25rem 0.6rem; font-size: 0.78rem; border-radius: 4px; cursor: pointer;">
                🔴 Close Trade
              </button>
            </td>
          </tr>
        `).join('');
      }
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
            let pnlStr = `$0.00`;
            let pnlColor = 'var(--color-text-secondary)';
            if (pnl > 0) {
              pnlStr = `+$${pnl.toFixed(2)}`;
              pnlColor = 'var(--color-success)';
            } else if (pnl < 0) {
              pnlStr = `-$${Math.abs(pnl).toFixed(2)}`;
              pnlColor = 'var(--color-danger)';
            }
            
            // Format duration
            const durationMins = Math.floor((trade.duration || 0) / 60);
            const durationSecs = (trade.duration || 0) % 60;
            const durationStr = `${durationMins}m ${durationSecs}s`;

            // Format open and close times
            const fmtTime = (iso) => {
              if (!iso) return '—';
              const d = new Date(iso);
              if (isNaN(d.getTime())) return '—';
              return d.toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: true
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
                <td style="color: ${pnlColor}; font-weight: 600;">${pnlStr}</td>
                <td style="font-size: 0.78rem; color: var(--color-text-secondary);">${fmtTime(trade.openTime)}</td>
                <td style="font-size: 0.78rem; color: var(--color-text-secondary);">${fmtTime(trade.closeTime)}</td>
                <td><span style="font-weight: 500;">${trade.closeReason || 'Manual'}</span></td>
                <td>${durationStr}</td>
                <td>
                  <a href="#/replay?tradeId=${trade._id || trade.mt5Ticket}" class="btn" style="background: rgba(59,130,246,0.15); color: #3b82f6; border: 1px solid rgba(59,130,246,0.3); padding: 0.25rem 0.6rem; font-size: 0.78rem; border-radius: 4px; text-decoration: none; display: inline-flex; align-items: center; gap: 0.25rem;">
                    <i class="fa-solid fa-film"></i> Replay
                  </a>
                </td>
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
