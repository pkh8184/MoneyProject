"""
지표 사전 계산 스크립트.
입력: public/data/ohlcv.json
출력: public/data/indicators.json
"""
import json
import sys
from pathlib import Path
from datetime import datetime
import pytz
import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent / 'public' / 'data'


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


def compute_high52w(df: pd.DataFrame, window: int = 250) -> pd.Series:
    """52주(250거래일) 신고가 (종가 기준)."""
    return df['close'].rolling(window=window, min_periods=1).max()


def compute_vol_avg20(df: pd.DataFrame, window: int = 20) -> pd.Series:
    """거래량 20일 평균 (전일 기준, 당일 제외)."""
    return df['volume'].shift(1).rolling(window=window, min_periods=window).mean()


def _to_rounded_list(series, decimals: int = 2) -> list:
    """시리즈를 float 리스트로 변환, NaN은 None으로, 소수점 제한."""
    return [
        None if pd.isna(v) else round(float(v), decimals)
        for v in series.tolist()
    ]


def process_single_stock(
    code: str,
    name: str,
    market: str,
    ohlcv: dict,
    recent_days: int = 30
) -> dict | None:
    """단일 종목 지표 계산 후 최근 N일치 반환."""
    if len(ohlcv['close']) < 20:
        return None

    df = pd.DataFrame({
        'close':  ohlcv['close'],
        'volume': ohlcv['volume']
    }, index=pd.to_datetime(ohlcv['dates']))

    ma5   = compute_ma(df, 5)
    ma20  = compute_ma(df, 20)
    ma60  = compute_ma(df, 60)
    ma120 = compute_ma(df, 120)
    rsi14 = compute_rsi(df, 14)
    macd_line, macd_signal, macd_hist = compute_macd(df)
    bb_upper, bb_middle, bb_lower = compute_bollinger(df)
    vol_avg20 = compute_vol_avg20(df)
    high52w = compute_high52w(df)

    has_52w = len(df) >= 250

    tail_slice = slice(-recent_days, None)

    return {
        'name': name,
        'market': market,
        'dates':       ohlcv['dates'][tail_slice],
        'open':        ohlcv['open'][tail_slice],
        'high':        ohlcv['high'][tail_slice],
        'low':         ohlcv['low'][tail_slice],
        'close':       ohlcv['close'][tail_slice],
        'volume':      ohlcv['volume'][tail_slice],
        'ma5':         _to_rounded_list(ma5.iloc[tail_slice]),
        'ma20':        _to_rounded_list(ma20.iloc[tail_slice]),
        'ma60':        _to_rounded_list(ma60.iloc[tail_slice]),
        'ma120':       _to_rounded_list(ma120.iloc[tail_slice]),
        'rsi14':       _to_rounded_list(rsi14.iloc[tail_slice]),
        'macd_line':   _to_rounded_list(macd_line.iloc[tail_slice]),
        'macd_signal': _to_rounded_list(macd_signal.iloc[tail_slice]),
        'macd_hist':   _to_rounded_list(macd_hist.iloc[tail_slice]),
        'bb_upper':    _to_rounded_list(bb_upper.iloc[tail_slice]),
        'bb_middle':   _to_rounded_list(bb_middle.iloc[tail_slice]),
        'bb_lower':    _to_rounded_list(bb_lower.iloc[tail_slice]),
        'high52w':     None if pd.isna(high52w.iloc[-1]) else int(high52w.iloc[-1]),
        'has_52w':     has_52w,
        'vol_avg20':   None if pd.isna(vol_avg20.iloc[-1]) else int(vol_avg20.iloc[-1])
    }


def main():
    stocks_path = DATA_DIR / 'stocks.json'
    ohlcv_path = DATA_DIR / 'ohlcv.json'

    if not stocks_path.exists() or not ohlcv_path.exists():
        print('[ERROR] stocks.json or ohlcv.json missing. Run fetch_stocks.py first.',
              file=sys.stderr)
        sys.exit(1)

    stocks = json.loads(stocks_path.read_text(encoding='utf-8'))
    ohlcv_all = json.loads(ohlcv_path.read_text(encoding='utf-8'))

    kst = pytz.timezone('Asia/Seoul')
    result = {
        'meta': {
            'updated_at': datetime.now(kst).isoformat(),
            'trade_date': stocks['trade_date'],
            'stock_count': 0,
            'days': 30
        }
    }

    processed = 0
    for s in stocks['stocks']:
        code = s['code']
        if code not in ohlcv_all:
            continue
        indicators = process_single_stock(
            code, s['name'], s['market'], ohlcv_all[code]
        )
        if indicators is not None:
            result[code] = indicators
            processed += 1

    result['meta']['stock_count'] = processed

    (DATA_DIR / 'indicators.json').write_text(
        json.dumps(result, ensure_ascii=False),
        encoding='utf-8'
    )
    print(f'[INFO] indicators.json saved ({processed} stocks)')


if __name__ == '__main__':
    main()
