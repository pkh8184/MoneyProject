import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd
from calculate_indicators import compute_macd


def test_macd_returns_three_series():
    closes = list(range(100, 160))
    df = pd.DataFrame({'close': closes})
    line, signal, hist = compute_macd(df)
    assert len(line) == len(df)
    assert len(signal) == len(df)
    assert len(hist) == len(df)


def test_macd_hist_equals_line_minus_signal():
    closes = list(range(100, 160))
    df = pd.DataFrame({'close': closes})
    line, signal, hist = compute_macd(df)
    import numpy as np
    tail_line = line.tail(10).values
    tail_signal = signal.tail(10).values
    tail_hist = hist.tail(10).values
    assert np.allclose(tail_hist, tail_line - tail_signal, equal_nan=True)


def test_macd_uptrend_line_above_signal():
    closes = list(range(100, 200))
    df = pd.DataFrame({'close': closes})
    line, signal, _ = compute_macd(df)
    assert line.iloc[-1] > signal.iloc[-1]
