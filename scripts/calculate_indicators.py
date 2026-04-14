"""
지표 사전 계산 스크립트.
입력: public/data/ohlcv.json
출력: public/data/indicators.json
"""
import pandas as pd


def compute_ma(df: pd.DataFrame, window: int) -> pd.Series:
    """단순이동평균 (Simple Moving Average)."""
    return df['close'].rolling(window=window, min_periods=window).mean()


def compute_rsi(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """RSI (Wilder's smoothing)."""
    delta = df['close'].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi


def compute_macd(
    df: pd.DataFrame,
    fast: int = 12,
    slow: int = 26,
    signal_period: int = 9
) -> tuple[pd.Series, pd.Series, pd.Series]:
    """MACD (Line, Signal, Histogram)."""
    ema_fast = df['close'].ewm(span=fast, adjust=False).mean()
    ema_slow = df['close'].ewm(span=slow, adjust=False).mean()
    line = ema_fast - ema_slow
    signal = line.ewm(span=signal_period, adjust=False).mean()
    hist = line - signal
    return line, signal, hist


def compute_bollinger(
    df: pd.DataFrame,
    window: int = 20,
    std_mult: float = 2.0
) -> tuple[pd.Series, pd.Series, pd.Series]:
    """볼린저밴드 (Upper, Middle, Lower)."""
    middle = df['close'].rolling(window=window, min_periods=window).mean()
    std = df['close'].rolling(window=window, min_periods=window).std(ddof=0)
    upper = middle + std_mult * std
    lower = middle - std_mult * std
    return upper, middle, lower


if __name__ == '__main__':
    # 메인 로직은 Task 11에서 구현
    pass
