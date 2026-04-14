import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd
import numpy as np
from calculate_indicators import compute_rsi


def _sample_prices():
    closes = [
        44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42,
        45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00,
        46.03, 46.41, 46.22, 45.64
    ]
    return pd.DataFrame({'close': closes})


def test_rsi_within_0_to_100():
    df = _sample_prices()
    rsi = compute_rsi(df, period=14)
    valid = rsi.dropna()
    assert (valid >= 0).all() and (valid <= 100).all()


def test_rsi_insufficient_data_is_nan():
    df = pd.DataFrame({'close': [100, 101, 102]})
    rsi = compute_rsi(df, period=14)
    assert rsi.isna().all()


def test_rsi_uptrend_above_50():
    df = pd.DataFrame({'close': list(range(100, 130))})
    rsi = compute_rsi(df, period=14)
    assert rsi.iloc[-1] > 50


def test_rsi_downtrend_below_50():
    df = pd.DataFrame({'close': list(range(130, 100, -1))})
    rsi = compute_rsi(df, period=14)
    assert rsi.iloc[-1] < 50
