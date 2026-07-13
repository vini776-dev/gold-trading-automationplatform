import time
import MetaTrader5 as mt5
import config
import node_client
from logger import logger

def execute_order(signal, settings):
    """
    Sends order request to MT5 based on strategy signals and settings.
    Supports DRY_RUN mode for risk-free testing.
    """
    symbol = settings.get('symbol', 'XAUUSD')
    import mt5_connector
    resolved_symbol = mt5_connector.resolve_symbol(symbol)
    lot_size = settings.get('lotSize', 0.20)
    sl_buffer = settings.get('stopLossBuffer', 0.02)

    # 1. Fetch Current Market Prices
    if config.DRY_RUN:
        class MockSymbolInfo:
            bid = 2000.0
            ask = 2000.5
        symbol_info = MockSymbolInfo()
    else:
        symbol_info = mt5.symbol_info_tick(resolved_symbol)
        if not symbol_info:
            logger.error(f"Failed to get symbol tick info for {resolved_symbol} (original: {symbol})")
            return None

    if signal == "BUY":
        price = symbol_info.ask
        sl = price - sl_buffer
        tp = price + (sl_buffer * 2.0) # 1:2 RR ratio
        order_type = mt5.ORDER_TYPE_BUY
    elif signal == "SELL":
        price = symbol_info.bid
        sl = price + sl_buffer
        tp = price - (sl_buffer * 2.0)
        order_type = mt5.ORDER_TYPE_SELL
    else:
        return None

    logger.info(f"Preparing {signal} order for {symbol} | Price: {price:.2f}, SL: {sl:.2f}, TP: {tp:.2f}, Lot: {lot_size}")

    # 2. Dry Run Mocking
    if config.DRY_RUN:
        mock_ticket = int(time.time())
        logger.info(f"[DRY_RUN] Mock order successfully placed. Ticket: {mock_ticket}")
        return {
            "mt5Ticket": mock_ticket,
            "symbol": symbol,
            "orderType": signal,
            "lotSize": lot_size,
            "entryPrice": price,
            "stopLoss": sl,
            "takeProfit": tp,
            "broker": "XM (Mock)",
            "tradeSource": "bot",
            "openTime": new_date_iso()
        }

    # 3. Assemble MT5 Order request
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": resolved_symbol,
        "volume": lot_size,
        "type": order_type,
        "price": price,
        "sl": sl,
        "tp": tp,
        "deviation": 20,
        "magic": 123456,
        "comment": "GTAP Auto Trade",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC
    }

    # 4. Send Order to MT5
    result = mt5.order_send(request)
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        logger.error(f"Order execution failed, code: {result.retcode}, comment: {result.comment}")
        return None

    logger.info(f"Order successfully executed on MT5. Ticket: {result.order}")
    return {
        "mt5Ticket": result.order,
        "symbol": symbol,
        "orderType": signal,
        "lotSize": lot_size,
        "entryPrice": price,
        "stopLoss": sl,
        "takeProfit": tp,
        "broker": settings.get('broker', 'XM'),
        "tradeSource": "bot",
        "openTime": new_date_iso()
    }

def monitor_active_trades(active_trades, settings):
    """
    Checks if active trades are still open on MT5.
    If closed (SL/TP hit), reports it to Node.js backend.
    """
    if not active_trades:
        return

    # In DRY_RUN mode, simulate trade exits (SL/TP hit) randomly
    if config.DRY_RUN:
        import random
        for trade in active_trades:
            # 20% chance to close trade per check cycle
            if random.random() < 0.20:
                ticket = trade.get('mt5Ticket')
                trade_db_id = trade.get('_id')
                is_profit = random.choice([True, False])
                pnl = random.uniform(10.0, 50.0) if is_profit else random.uniform(-10.0, -30.0)
                reason = "TP" if is_profit else "SL"
                
                logger.info(f"[DRY_RUN] Mock closing trade {ticket} via {reason}. PnL: ${pnl:.2f}")
                close_payload = {
                    "exitPrice": trade.get('entryPrice') + (pnl / 100.0),
                    "closeTime": new_date_iso(),
                    "profitLoss": pnl,
                    "closeReason": reason,
                    "duration": int(random.uniform(60, 300))
                }
                node_client.close_trade(trade_db_id, close_payload)
        return

    # Fetch all open positions on MT5
    positions = mt5.positions_get()
    if positions is None:
        logger.error(f"Failed to get open positions from MT5: {mt5.last_error()}")
        return

    # Create a lookup map of active tickets on MT5
    open_tickets = {pos.ticket: pos for pos in positions}

    for trade in active_trades:
        ticket = trade.get('mt5Ticket')
        trade_db_id = trade.get('_id')

        if ticket not in open_tickets:
            # Trade has been closed on MT5 (SL/TP or manual close)
            logger.info(f"Active trade ticket {ticket} is no longer open in MT5. Querying history to close on Node...")
            close_details = fetch_close_details(ticket)
            
            if close_details:
                # Update status on Node
                node_client.close_trade(trade_db_id, close_details)
            else:
                logger.error(f"Failed to find close history for ticket {ticket}")

def fetch_close_details(ticket):
    """
    Queries MT5 history to retrieve details of a closed deal.
    """
    # Fetch historical deals for this ticket
    from_date = int(time.time()) - 24 * 60 * 60 # Check last 24h
    to_date = int(time.time()) + 60
    
    history_deals = mt5.history_deals_get(from_date, to_date, ticket=ticket)
    if not history_deals:
        # Check from start of day if 24h is not enough
        history_deals = mt5.history_deals_get(ticket=ticket)

    if not history_deals:
        return None

    # Filter for the closing deal (the one with entry status Out)
    # In MT5 history, the opening deal has entry=0 (In) and closing deal has entry=1 (Out)
    closing_deal = None
    for deal in history_deals:
        if deal.entry == 1: # Out
            closing_deal = deal
            break

    if not closing_deal:
        # Fallback to the latest deal found
        closing_deal = history_deals[-1]

    # Map closing reason
    reason_map = {
        3: "SL",
        4: "TP"
    }
    # mt5.DEAL_REASON_SL = 3, mt5.DEAL_REASON_TP = 4
    reason_code = getattr(closing_deal, 'reason', 0)
    close_reason = reason_map.get(reason_code, "Manual")

    return {
        "exitPrice": closing_deal.price,
        "closeTime": time_to_iso(closing_deal.time),
        "closeReason": close_reason
    }

def time_to_iso(timestamp):
    return time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime(timestamp))

def new_date_iso():
    return time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
