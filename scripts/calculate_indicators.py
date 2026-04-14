"""
지표 사전 계산 스크립트.
입력: public/data/ohlcv.json
출력: public/data/indicators.json
"""
import pandas as pd


def compute_ma(df: pd.DataFrame, window: int) -> pd.Series:
    """단순이동평균 (Simple Moving Average)."""
    return df['close'].rolling(window=window, min_periods=window).mean()


if __name__ == '__main__':
    # 메인 로직은 Task 11에서 구현
    pass
