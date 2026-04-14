import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd
import numpy as np
from calculate_indicators import compute_bollinger


def test_bb_middle_equals_ma20():
    df = pd.DataFrame({'close': list(range(100, 150))})
    upper, middle, lower = compute_bollinger(df, window=20, std_mult=2)
    expected_middle = df['close'].rolling(20, min_periods=20).mean()
    pd.testing.assert_series_equal(middle, expected_middle, check_names=False)


def test_bb_upper_gt_middle_gt_lower():
    df = pd.DataFrame({'close': [100 + np.sin(i/3)*10 for i in range(50)]})
    upper, middle, lower = compute_bollinger(df, window=20, std_mult=2)
    valid = upper.dropna().index
    for idx in valid:
        assert upper[idx] > middle[idx] > lower[idx]


def test_bb_insufficient_data_is_nan():
    df = pd.DataFrame({'close': list(range(100, 110))})
    upper, middle, lower = compute_bollinger(df, window=20, std_mult=2)
    assert upper.isna().all()
    assert middle.isna().all()
    assert lower.isna().all()
