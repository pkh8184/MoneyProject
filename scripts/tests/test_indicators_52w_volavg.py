import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd
from calculate_indicators import compute_high52w, compute_vol_avg20


def test_high52w_returns_running_max():
    df = pd.DataFrame({'close': [100, 105, 98, 110, 107, 120, 115]})
    result = compute_high52w(df)
    assert result.iloc[-1] == 120


def test_high52w_window_limit():
    closes = [200] + [100] * 250 + [150]
    df = pd.DataFrame({'close': closes})
    result = compute_high52w(df)
    assert result.iloc[-1] == 150


def test_vol_avg20_excludes_today():
    volumes = [100] * 20 + [9999]
    df = pd.DataFrame({'volume': volumes})
    result = compute_vol_avg20(df)
    assert result.iloc[-1] == 100
    assert result.iloc[-1] != 9999


def test_vol_avg20_insufficient_data_is_nan():
    df = pd.DataFrame({'volume': [100, 200, 300]})
    result = compute_vol_avg20(df)
    assert result.isna().all()
