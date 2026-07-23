import { API } from '../api.js';
import { APP } from '../app.js';

let chart = null;
let candleSeries = null;
let ema9Series = null;
let ema15Series = null;
let slPriceLine = null;
let tpPriceLine = null;
let entryPriceLine = null;

let currentReplayData = null;
let activeCandles = [];
let playInterval = null;
let currentFrameIndex = 0;
let playbackSpeedMs = 600;

export const ReplayPage = {
  render: () => {
    return `
      <div style="display: flex; flex-direction: column; height: calc(100vh - 110px); gap: 1rem;">
        
        <!-- Top Toolbar & Navigation -->
        <div class="card" style="margin-bottom: 0; padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <a href="#/reports" class="btn" style="background: rgba(255,255,255,0.08); color: #fff; padding: 0.4rem 0.8rem; font-size: 0.85rem;">
              <i class="fa-solid fa-arrow-left" style="margin-right: 0.4rem;"></i> Back to Reports
            </a>
            <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem;">
              <i class="fa-solid fa-film" style="color: var(--color-primary);"></i>
              Trade Replay: <span id="replay-trade-ticket" style="color: var(--color-primary);">#—</span>
            </h3>
            <span id="replay-trade-type-badge" class="badge" style="font-size: 0.8rem;">BUY</span>
          </div>

          <!-- Playback & Navigation Controls -->
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <button id="replay-btn-prev-trade" class="btn" style="background: var(--color-bg-primary); border: 1px solid var(--color-border); color: #fff; padding: 0.4rem 0.75rem; font-size: 0.85rem;" title="Previous Trade">
              <i class="fa-solid fa-step-backward"></i> Prev Trade
            </button>

            <div style="display: flex; background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: 6px; padding: 2px;">
              <button id="replay-btn-step-back" class="btn" style="background: transparent; color: #fff; padding: 0.35rem 0.65rem;" title="Step Back 1 Candle"><i class="fa-solid fa-backward"></i></button>
              <button id="replay-btn-play" class="btn" style="background: var(--color-primary); color: #fff; padding: 0.35rem 0.85rem;" title="Play/Pause"><i class="fa-solid fa-play" id="play-icon"></i></button>
              <button id="replay-btn-step-fwd" class="btn" style="background: transparent; color: #fff; padding: 0.35rem 0.65rem;" title="Step Forward 1 Candle"><i class="fa-solid fa-forward"></i></button>
            </div>

            <select id="replay-speed-select" style="background: var(--color-bg-primary); border: 1px solid var(--color-border); color: #fff; padding: 0.4rem 0.6rem; border-radius: 6px; font-size: 0.82rem;">
              <option value="1000">0.5x Speed</option>
              <option value="600" selected>1x Speed</option>
              <option value="300">2x Speed</option>
              <option value="100">5x Speed</option>
            </select>

            <button id="replay-btn-next-trade" class="btn" style="background: var(--color-bg-primary); border: 1px solid var(--color-border); color: #fff; padding: 0.4rem 0.75rem; font-size: 0.85rem;" title="Next Trade">
              Next Trade <i class="fa-solid fa-step-forward"></i>
            </button>
          </div>
        </div>

        <!-- Main Replay Content Grid (Chart + Strategy Decision Panel) -->
        <div style="display: grid; grid-template-columns: 1fr 340px; gap: 1rem; flex: 1; min-height: 0;">
          
          <!-- Left: Lightweight Chart Panel -->
          <div class="card" style="margin-bottom: 0; padding: 1rem; display: flex; flex-direction: column; position: relative;">
            
            <!-- Hover Telemetry Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; font-size: 0.82rem; background: rgba(0,0,0,0.3); padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid var(--color-border);">
              <div style="display: flex; gap: 1rem; font-family: monospace;">
                <span>O: <strong id="hover-open" style="color:#fff;">—</strong></span>
                <span>H: <strong id="hover-high" style="color:#10b981;">—</strong></span>
                <span>L: <strong id="hover-low" style="color:#ef4444;">—</strong></span>
                <span>C: <strong id="hover-close" style="color:#fff;">—</strong></span>
                <span>V: <strong id="hover-vol" style="color:#94a3b8;">—</strong></span>
              </div>
              <div style="display: flex; gap: 0.75rem; font-size: 0.8rem;">
                <span style="color: #f59e0b;">EMA 9: <strong id="hover-ema9">—</strong></span>
                <span style="color: #a78bfa;">EMA 15: <strong id="hover-ema15">—</strong></span>
                <span style="color: #38bdf8;">ATR: <strong id="hover-atr">—</strong></span>
              </div>
            </div>

            <!-- Chart Outlet -->
            <div id="replay-chart-container" style="flex: 1; position: relative; width: 100%; height: 100%; min-height: 350px;">
              <div id="replay-chart" style="width: 100%; height: 100%;"></div>
            </div>
          </div>

          <!-- Right: Strategy Analysis Panel -->
          <div class="card" style="margin-bottom: 0; padding: 1.25rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1.25rem;">
            
            <!-- Trade Metrics Card -->
            <div>
              <h4 style="margin: 0 0 0.75rem 0; font-size: 0.9rem; font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Trade Summary</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; font-size: 0.85rem; background: var(--color-bg-primary); padding: 0.85rem; border-radius: 8px; border: 1px solid var(--color-border);">
                <div><span style="color: var(--color-text-muted);">Ticket:</span> <strong id="panel-ticket">#—</strong></div>
                <div><span style="color: var(--color-text-muted);">Direction:</span> <strong id="panel-direction">—</strong></div>
                <div><span style="color: var(--color-text-muted);">Entry Price:</span> <strong id="panel-entry">—</strong></div>
                <div><span style="color: var(--color-text-muted);">Exit Price:</span> <strong id="panel-exit">—</strong></div>
                <div><span style="color: var(--color-text-muted);">Stop Loss:</span> <strong id="panel-sl" style="color: #ef4444;">—</strong></div>
                <div><span style="color: var(--color-text-muted);">Take Profit:</span> <strong id="panel-tp" style="color: #10b981;">—</strong></div>
                <div><span style="color: var(--color-text-muted);">P&L:</span> <strong id="panel-pnl">—</strong></div>
                <div><span style="color: var(--color-text-muted);">Close Reason:</span> <strong id="panel-reason">—</strong></div>
                <div><span style="color: var(--color-text-muted);">Duration:</span> <span id="panel-duration">—</span></div>
                <div><span style="color: var(--color-text-muted);">R:R Ratio:</span> <span id="panel-rr">1:2</span></div>
              </div>
            </div>

            <!-- Strategy Decision Breakdown -->
            <div>
              <h4 style="margin: 0 0 0.75rem 0; font-size: 0.9rem; font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Strategy Rule Checklist</h4>
              <div id="strategy-filters-checklist" style="display: flex; flex-direction: column; gap: 0.5rem;">
                <!-- Dynamically populated -->
              </div>
            </div>

            <!-- Final Decision Card -->
            <div style="background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; padding: 0.85rem; text-align: center;" id="final-decision-card">
              <span style="font-size: 0.75rem; color: var(--color-text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Final Strategy Decision</span>
              <div id="final-decision-text" style="font-size: 1.2rem; font-weight: 800; color: #10b981; margin-top: 0.25rem;">BUY SIGNAL EXECUTED</div>
            </div>

          </div>
        </div>

      </div>
    `;
  },

  onMount: async () => {
    // Parse query params for tradeId
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
    const tradeId = urlParams.get('tradeId') || urlParams.get('ticket');

    if (!tradeId) {
      APP.showToast('No trade selected for replay', 'error');
      window.location.hash = '#/reports';
      return;
    }

    ReplayPage.initChart();
    await ReplayPage.loadTrade(tradeId);

    // Bind playback controls
    const playBtn = document.getElementById('replay-btn-play');
    const playIcon = document.getElementById('play-icon');
    const stepFwdBtn = document.getElementById('replay-btn-step-fwd');
    const stepBackBtn = document.getElementById('replay-btn-step-back');
    const speedSelect = document.getElementById('replay-speed-select');

    speedSelect.addEventListener('change', () => {
      playbackSpeedMs = parseInt(speedSelect.value);
      if (playInterval) {
        ReplayPage.pause();
        ReplayPage.play();
      }
    });

    playBtn.addEventListener('click', () => {
      if (playInterval) {
        ReplayPage.pause();
      } else {
        ReplayPage.play();
      }
    });

    stepFwdBtn.addEventListener('click', () => {
      ReplayPage.pause();
      ReplayPage.stepForward();
    });

    stepBackBtn.addEventListener('click', () => {
      ReplayPage.pause();
      ReplayPage.stepBackward();
    });
  },

  initChart: () => {
    const container = document.getElementById('replay-chart-container');
    const chartEl = document.getElementById('replay-chart');
    if (!container || !chartEl) return;

    chartEl.innerHTML = '';
    chart = LightweightCharts.createChart(chartEl, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: { background: { color: '#0f172a' }, textColor: '#94a3b8' },
      grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
      crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#334155' },
      timeScale: { borderColor: '#334155', timeVisible: true },
    });

    candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981', downColor: '#ef4444',
      borderUpColor: '#10b981', borderDownColor: '#ef4444',
      wickUpColor: '#10b981', wickDownColor: '#ef4444',
    });

    ema9Series = chart.addLineSeries({ color: '#f59e0b', lineWidth: 2, title: 'EMA 9' });
    ema15Series = chart.addLineSeries({ color: '#a78bfa', lineWidth: 2, title: 'EMA 15' });

    // Handle Resize
    window.addEventListener('resize', () => {
      if (chart && container) {
        chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
      }
    });

    // Crosshair hover telemetry
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesPrices) return;
      const candleData = param.seriesPrices.get(candleSeries);
      if (candleData) {
        document.getElementById('hover-open').textContent = candleData.open.toFixed(2);
        document.getElementById('hover-high').textContent = candleData.high.toFixed(2);
        document.getElementById('hover-low').textContent = candleData.low.toFixed(2);
        document.getElementById('hover-close').textContent = candleData.close.toFixed(2);
      }
      const e9 = param.seriesPrices.get(ema9Series);
      if (e9) document.getElementById('hover-ema9').textContent = e9.toFixed(2);
      const e15 = param.seriesPrices.get(ema15Series);
      if (e15) document.getElementById('hover-ema15').textContent = e15.toFixed(2);
    });
  },

  loadTrade: async (tradeId) => {
    try {
      const response = await API.getTradeReplay(tradeId);
      if (!response || !response.success || !response.data) {
        APP.showToast('Failed to load trade replay details', 'error');
        return;
      }

      const trade = response.data;
      currentReplayData = trade;

      // Update Header Badges & Side Panel
      document.getElementById('replay-trade-ticket').textContent = `#${trade.ticket}`;
      document.getElementById('panel-ticket').textContent = `#${trade.ticket}`;
      
      const badge = document.getElementById('replay-trade-type-badge');
      badge.textContent = trade.orderType;
      badge.style.backgroundColor = trade.orderType === 'BUY' ? '#10b981' : '#ef4444';

      document.getElementById('panel-direction').textContent = trade.orderType;
      document.getElementById('panel-direction').style.color = trade.orderType === 'BUY' ? '#10b981' : '#ef4444';
      document.getElementById('panel-entry').textContent = `$${trade.entryPrice.toFixed(2)}`;
      document.getElementById('panel-exit').textContent = trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : '—';
      document.getElementById('panel-sl').textContent = trade.stopLoss ? `$${trade.stopLoss.toFixed(2)}` : '—';
      document.getElementById('panel-tp').textContent = trade.takeProfit ? `$${trade.takeProfit.toFixed(2)}` : '—';
      
      const pnl = trade.profitLoss || 0;
      const pnlColor = pnl >= 0 ? '#10b981' : '#ef4444';
      const pnlSign = pnl >= 0 ? '+' : '';
      document.getElementById('panel-pnl').textContent = `${pnlSign}$${pnl.toFixed(2)}`;
      document.getElementById('panel-pnl').style.color = pnlColor;

      document.getElementById('panel-reason').textContent = trade.closeReason || 'Manual';
      
      const mins = Math.floor((trade.duration || 0) / 60);
      const secs = (trade.duration || 0) % 60;
      document.getElementById('panel-duration').textContent = `${mins}m ${secs}s`;
      document.getElementById('panel-rr').textContent = trade.riskReward || '1:2';

      // Render Strategy Filter Checklist
      const filterBox = document.getElementById('strategy-filters-checklist');
      const filters = trade.replayData?.filtersBreakdown || {};
      const filterKeys = Object.keys(filters);

      if (filterKeys.length === 0) {
        filterBox.innerHTML = '<div style="color: var(--color-text-muted); font-size: 0.82rem;">Default filter evaluation recorded.</div>';
      } else {
        filterBox.innerHTML = filterKeys.map((key) => {
          const item = filters[key];
          const isPass = item.status === 'PASS';
          return `
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--color-bg-primary); padding: 0.5rem 0.75rem; border-radius: 6px; border-left: 3px solid ${isPass ? '#10b981' : '#ef4444'}; font-size: 0.82rem;">
              <span style="font-weight: 600; text-transform: capitalize;">${key.replace('_', ' ')}</span>
              <span style="font-weight: 700; color: ${isPass ? '#10b981' : '#ef4444'};">${isPass ? '✅ PASS' : '❌ FAIL'}</span>
            </div>
          `;
        }).join('');
      }

      // Populate Chart Candles & Indicators
      activeCandles = trade.replayData?.candles || [];
      if (activeCandles.length === 0) {
        APP.showToast('No candle history saved for this trade', 'warning');
        return;
      }

      const formattedCandles = activeCandles.map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));

      const formattedEma9 = activeCandles.map((c) => ({ time: c.time, value: c.ema9 || c.close }));
      const formattedEma15 = activeCandles.map((c) => ({ time: c.time, value: c.ema15 || c.close }));

      candleSeries.setData(formattedCandles);
      ema9Series.setData(formattedEma9);
      ema15Series.setData(formattedEma15);

      // Add Price Lines (SL, TP, Entry)
      if (slPriceLine) candleSeries.removePriceLine(slPriceLine);
      if (tpPriceLine) candleSeries.removePriceLine(tpPriceLine);
      if (entryPriceLine) candleSeries.removePriceLine(entryPriceLine);

      if (trade.stopLoss) {
        slPriceLine = candleSeries.createPriceLine({
          price: trade.stopLoss,
          color: '#ef4444',
          lineWidth: 2,
          lineStyle: LightweightCharts.LineStyle.Dashed,
          axisLabelVisible: true,
          title: `SL $${trade.stopLoss.toFixed(2)}`,
        });
      }

      if (trade.takeProfit) {
        tpPriceLine = candleSeries.createPriceLine({
          price: trade.takeProfit,
          color: '#10b981',
          lineWidth: 2,
          lineStyle: LightweightCharts.LineStyle.Dashed,
          axisLabelVisible: true,
          title: `TP $${trade.takeProfit.toFixed(2)}`,
        });
      }

      if (trade.entryPrice) {
        entryPriceLine = candleSeries.createPriceLine({
          price: trade.entryPrice,
          color: '#3b82f6',
          lineWidth: 2,
          lineStyle: LightweightCharts.LineStyle.Solid,
          axisLabelVisible: true,
          title: `ENTRY $${trade.entryPrice.toFixed(2)}`,
        });
      }

      // Add Entry & Exit Markers
      const entryIdx = trade.replayData?.entryIndex || 0;
      const exitIdx = trade.replayData?.exitIndex || activeCandles.length - 1;

      const markers = [];
      if (activeCandles[entryIdx]) {
        markers.push({
          time: activeCandles[entryIdx].time,
          position: trade.orderType === 'BUY' ? 'belowBar' : 'aboveBar',
          color: trade.orderType === 'BUY' ? '#10b981' : '#ef4444',
          shape: trade.orderType === 'BUY' ? 'arrowUp' : 'arrowDown',
          text: `🚀 ENTRY ${trade.orderType} @ $${trade.entryPrice.toFixed(2)}`,
        });
      }

      if (activeCandles[exitIdx] && trade.exitPrice) {
        markers.push({
          time: activeCandles[exitIdx].time,
          position: trade.orderType === 'BUY' ? 'aboveBar' : 'belowBar',
          color: pnl >= 0 ? '#10b981' : '#ef4444',
          shape: 'circle',
          text: `🏁 EXIT (${trade.closeReason}) @ $${trade.exitPrice.toFixed(2)} [${pnlSign}$${pnl.toFixed(2)}]`,
        });
      }

      candleSeries.setMarkers(markers);
      chart.timeScale().fitContent();

      // Position player at entry candle initially
      currentFrameIndex = entryIdx;

    } catch (err) {
      console.error('Failed to load trade replay:', err);
      APP.showToast('Failed to load trade replay details', 'error');
    }
  },

  play: () => {
    const playIcon = document.getElementById('play-icon');
    if (playIcon) playIcon.className = 'fa-solid fa-pause';

    playInterval = setInterval(() => {
      ReplayPage.stepForward();
    }, playbackSpeedMs);
  },

  pause: () => {
    if (playInterval) {
      clearInterval(playInterval);
      playInterval = null;
    }
    const playIcon = document.getElementById('play-icon');
    if (playIcon) playIcon.className = 'fa-solid fa-play';
  },

  stepForward: () => {
    if (!activeCandles || activeCandles.length === 0) return;
    if (currentFrameIndex < activeCandles.length - 1) {
      currentFrameIndex++;
      const bar = activeCandles[currentFrameIndex];
      chart.timeScale().scrollToPosition(currentFrameIndex - activeCandles.length + 10, true);
    } else {
      ReplayPage.pause();
    }
  },

  stepBackward: () => {
    if (!activeCandles || activeCandles.length === 0) return;
    if (currentFrameIndex > 0) {
      currentFrameIndex--;
      chart.timeScale().scrollToPosition(currentFrameIndex - activeCandles.length + 10, true);
    }
  }
};
