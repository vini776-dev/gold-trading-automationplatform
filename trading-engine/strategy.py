import pandas as pd
import pandas_ta as ta
from logger import logger

def is_up_fractal(df, idx):
    """
    Checks if a candle at a given index is an Up Fractal (Swing High).
    Requires the high at idx to be strictly greater than the highs of the 2 candles before and 2 after.
    """
    if idx < 2 or idx > len(df) - 3:
        return False
        
    high = df['high'].iloc[idx]
    return (high > df['high'].iloc[idx - 1] and
            high > df['high'].iloc[idx - 2] and
            high > df['high'].iloc[idx + 1] and
            high > df['high'].iloc[idx + 2])

def is_down_fractal(df, idx):
    """
    Checks if a candle at a given index is a Down Fractal (Swing Low).
    Requires the low at idx to be strictly less than the lows of the 2 candles before and 2 after.
    """
    if idx < 2 or idx > len(df) - 3:
        return False
        
    low = df['low'].iloc[idx]
    return (low < df['low'].iloc[idx - 1] and
            low < df['low'].iloc[idx - 2] and
            low < df['low'].iloc[idx + 1] and
            low < df['low'].iloc[idx + 2])

def check_signals(rates):
    """
    Evaluates M1 candle data and returns 'BUY', 'SELL', or None.
    rates is a list of tuples/dicts fetched from MT5, containing open, high, low, close, time.
    """
    # 1. Convert to DataFrame
    df = pd.DataFrame(rates)
    if len(df) < 50: # Ensure we have enough candles to calculate EMA and RSI
        logger.warning(f"Not enough data for calculations: {len(df)} candles")
        return None

    # 2. Calculate Indicators using pandas_ta
    df['ema_11'] = ta.ema(df['close'], length=11)
    df['rsi_14'] = ta.rsi(df['close'], length=14)

    # 3. Get values for the latest completed candle (Candle 0, which is the last row)
    candle_0_close = df['close'].iloc[-1]
    candle_0_ema = df['ema_11'].iloc[-1]
    candle_0_rsi = df['rsi_14'].iloc[-1]

    # Validate calculations
    if pd.isna(candle_0_ema) or pd.isna(candle_0_rsi):
        logger.warning("Indicator calculations returned NaN")
        return None

    # 4. Check for Fractals in the last 3 completed candles (Candle 2, Candle 3, Candle 4)
    # Relative index mapping:
    # Candle 0 -> index -1
    # Candle 1 -> index -2
    # Candle 2 -> index -3
    # Candle 3 -> index -4
    # Candle 4 -> index -5
    
    down_fractal_detected = (
        is_down_fractal(df, len(df) - 3) or # Candle 2
        is_down_fractal(df, len(df) - 4) or # Candle 3
        is_down_fractal(df, len(df) - 5)    # Candle 4
    )

    up_fractal_detected = (
        is_up_fractal(df, len(df) - 3) or   # Candle 2
        is_up_fractal(df, len(df) - 4) or   # Candle 3
        is_up_fractal(df, len(df) - 5)      # Candle 4
    )

    # 5. Signal Evaluation
    # BUY Signal: Close > EMA(11) AND RSI(14) > 50 AND Down Fractal detected in last 3 candles
    if candle_0_close > candle_0_ema and candle_0_rsi > 50 and down_fractal_detected:
        logger.info(f"BUY Signal Triggered. Close: {candle_0_close:.2f}, EMA: {candle_0_ema:.2f}, RSI: {candle_0_rsi:.2f}")
        return "BUY"

    # SELL Signal: Close < EMA(11) AND RSI(14) < 50 AND Up Fractal detected in last 3 candles
    if candle_0_close < candle_0_ema and candle_0_rsi < 50 and up_fractal_detected:
        logger.info(f"SELL Signal Triggered. Close: {candle_0_close:.2f}, EMA: {candle_0_ema:.2f}, RSI: {candle_0_rsi:.2f}")
        return "SELL"

    return None
