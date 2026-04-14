import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd
from fixtures import sample_ohlcv_30days
from calculate_indicators import compute_ma


def test_ma5_matches_rolling_mean():
    df = sample_ohlcv_30days()
    result = compute_ma(df, window=5)
    expected_last = df['close'].tail(5).mean()
    assert result.iloc[-1] == expected_last


def test_ma20_first_19_are_nan():
    df = sample_ohlcv_30days()
    result = compute_ma(df, window=20)
    assert result.iloc[:19].isna().all()
    assert not pd.isna(result.iloc[19])


def test_ma_insufficient_data_returns_all_nan():
    df = sample_ohlcv_30days().head(10)
    result = compute_ma(df, window=20)
    assert result.isna().all()
