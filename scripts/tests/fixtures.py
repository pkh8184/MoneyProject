"""테스트용 샘플 OHLCV 데이터."""
import pandas as pd


def sample_ohlcv_30days() -> pd.DataFrame:
    """30거래일 분량의 가짜 OHLCV (단순 선형 상승)."""
    dates = pd.date_range('2024-01-02', periods=30, freq='B')
    closes = [1000 + i * 10 for i in range(30)]
    opens  = [c - 5 for c in closes]
    highs  = [c + 5 for c in closes]
    lows   = [c - 10 for c in closes]
    volumes = [1000000 + i * 10000 for i in range(30)]
    return pd.DataFrame({
        'open': opens, 'high': highs, 'low': lows,
        'close': closes, 'volume': volumes
    }, index=dates)
