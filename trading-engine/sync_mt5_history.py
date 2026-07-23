import MetaTrader5 as mt5
from datetime import datetime, timezone
import node_client
import config
from logger import logger

def sync_mt5_history_deals():
    if config.DRY_RUN:
        return

    if not mt5.initialize():
        return

    try:
        from datetime import timedelta
        now = datetime.now(timezone.utc)
        start_time = now - timedelta(days=2)
        
        deals = mt5.history_deals_get(start_time, now + timedelta(days=1))
        if not deals:
            return

        # Group deals by position_id
        positions = {}
        for d in deals:
            pos_id = d.position_id
            if pos_id not in positions:
                positions[pos_id] = []
            positions[pos_id].append(d)

        settings = node_client.get_settings()
        broker_name = settings.get("broker", "XM") if settings else "XM"

        for pos_id, p_deals in positions.items():
            in_deal  = next((d for d in p_deals if d.entry == mt5.DEAL_ENTRY_IN), None)
            out_deal = next((d for d in p_deals if d.entry == mt5.DEAL_ENTRY_OUT), None)

            if not in_deal:
                continue

            import execution
            direction = "BUY" if in_deal.type == mt5.ORDER_TYPE_BUY else "SELL"
            open_iso  = execution._time_to_iso(in_deal.time)
            
            sl_val = getattr(in_deal, 'sl', 0.0) or round(float(in_deal.price) * 0.99, 2)
            tp_val = getattr(in_deal, 'tp', 0.0) or round(float(in_deal.price) * 1.01, 2)

            # Create open trade in GTAP DB
            trade_payload = {
                "mt5Ticket":        pos_id,
                "symbol":           "XAUUSD",
                "orderType":        direction,
                "lotSize":          round(float(in_deal.volume), 2),
                "entryPrice":       round(float(in_deal.price), 2),
                "stopLoss":         round(float(sl_val), 2),
                "takeProfit":       round(float(tp_val), 2),
                "broker":           broker_name,
                "tradeSource":      "bot",
                "openTime":         open_iso,
                "strategyName":     "EMA Engulfing (V1)",
                "signalConfidence": 0.9,
                "signalReason":     "MT5 Executed Trade",
            }

            created_trade = node_client.create_trade(trade_payload)

            # If deal is closed, sync/update close info in GTAP DB ONLY if not already closed
            if out_deal and created_trade and created_trade.get("status") != "CLOSED":
                trade_id = created_trade.get("_id")
                close_iso = execution._time_to_iso(out_deal.time)
                close_reason = "TP" if out_deal.profit > 0 else ("SL" if out_deal.profit < 0 else "Manual")
                
                close_payload = {
                    "exitPrice":   round(float(out_deal.price), 2),
                    "closeTime":   close_iso,
                    "closeReason": close_reason,
                    "profitLoss":  round(float(out_deal.profit), 2)
                }
                node_client.close_trade(trade_id, close_payload)

    except Exception as e:
        logger.error(f"[HistorySync] Error syncing MT5 history: {e}")
    finally:
        pass

if __name__ == "__main__":
    sync_mt5_history_deals()
