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


if __name__ == '__main__':
    # 메인 로직은 Task 11에서 구현
    pass
