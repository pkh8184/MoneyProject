"""
과거 유사 패턴 통계 계산.
입력: public/data/ohlcv.json, indicators.json
출력: public/data/pattern_stats.json

각 종목에 대해 2개의 이벤트 패턴의 과거 발생을 스캔하고,
D+1/D+3/D+7 수익률 통계를 집계.
"""
import json
import sys
from pathlib import Path
from datetime import datetime
import pytz
import numpy as np

DATA_DIR = Path(__file__).resolve().parent.parent / 'public' / 'data'
MIN_SAMPLE = 5  # 최소 5건 이상만 통계 유효
OUTLIER_Z = 5.0  # 5σ 이상 극단치 제거


def volume_spike_events(ohlcv: dict, k: float = 1.5) -> list[int]:
    """거래량 급증 + 양봉 이벤트 발생 인덱스 리스트."""
    close = ohlcv['close']
    volume = ohlcv['volume']
    n = len(close)
    if n < 25:
        return []
    events = []
    for t in range(20, n):
        vol_avg = sum(volume[t-20:t]) / 20
        if vol_avg <= 0:
            continue
        if volume[t] >= vol_avg * k and close[t] > close[t-1]:
            events.append(t)
    return events


def golden_cross_events(ohlcv: dict) -> list[int]:
    """MA20 > MA60 상향 돌파 이벤트."""
    close = ohlcv['close']
    n = len(close)
    if n < 61:
        return []
    events = []
    for t in range(60, n):
        ma20_t = sum(close[t-19:t+1]) / 20
        ma60_t = sum(close[t-59:t+1]) / 60
        if t == 60:
            continue
        ma20_y = sum(close[t-20:t]) / 20
        ma60_y = sum(close[t-60:t]) / 60
        if ma20_t > ma60_t and ma20_y <= ma60_y:
            events.append(t)
    return events


def compute_return_stat(returns: list[float]) -> dict:
    """수익률 배열 → 평균/최대/상승률."""
    if not returns:
        return {'avg': 0.0, 'max': 0.0, 'win_rate': 0}
    arr = np.array(returns)
    if len(arr) >= 3:
        mean = arr.mean()
        std = arr.std()
        if std > 0:
            arr = arr[np.abs(arr - mean) <= OUTLIER_Z * std]
    if len(arr) == 0:
        return {'avg': 0.0, 'max': 0.0, 'win_rate': 0}
    positives = (arr > 0).sum()
    return {
        'avg': round(float(arr.mean()), 2),
        'max': round(float(arr.max()), 2),
        'win_rate': int(round(positives / len(arr) * 100))
    }


def aggregate_events(ohlcv: dict, events: list[int]) -> dict:
    """이벤트 시점별 D+1/D+3/D+7 수익률 집계."""
    close = ohlcv['close']
    n = len(close)
    r1, r3, r7 = [], [], []
    for t in events:
        c0 = close[t]
        if c0 <= 0:
            continue
        if t + 1 < n:
            r1.append((close[t+1] - c0) / c0 * 100)
        if t + 3 < n:
            r3.append((close[t+3] - c0) / c0 * 100)
        if t + 7 < n:
            r7.append((close[t+7] - c0) / c0 * 100)
    return {
        'sample_count': len(events),
        'd1': compute_return_stat(r1),
        'd3': compute_return_stat(r3),
        'd7': compute_return_stat(r7)
    }


def main():
    ohlcv_path = DATA_DIR / 'ohlcv.json'
    if not ohlcv_path.exists():
        print('[ERROR] ohlcv.json missing', file=sys.stderr)
        sys.exit(1)

    ohlcv_all = json.loads(ohlcv_path.read_text(encoding='utf-8'))
    kst = pytz.timezone('Asia/Seoul')

    result = {
        'meta': {
            'updated_at': datetime.now(kst).isoformat(),
            'lookback_days': 1830
        },
        'by_stock_preset': {}
    }

    print(f'[INFO] Analyzing {len(ohlcv_all)} stocks...')
    processed = 0
    for code, ohlcv in ohlcv_all.items():
        stats_for_stock = {}

        vs_events = volume_spike_events(ohlcv, k=1.5)
        if len(vs_events) >= MIN_SAMPLE:
            stats_for_stock['volume_spike'] = aggregate_events(ohlcv, vs_events)

        gc_events = golden_cross_events(ohlcv)
        if len(gc_events) >= MIN_SAMPLE:
            stats_for_stock['golden_cross'] = aggregate_events(ohlcv, gc_events)

        if stats_for_stock:
            result['by_stock_preset'][code] = stats_for_stock

        processed += 1
        if processed % 500 == 0:
            print(f'[INFO] {processed}/{len(ohlcv_all)} analyzed')

    (DATA_DIR / 'pattern_stats.json').write_text(
        json.dumps(result, ensure_ascii=False),
        encoding='utf-8'
    )
    print(f'[INFO] pattern_stats.json saved ({len(result["by_stock_preset"])} stocks with stats)')


if __name__ == '__main__':
    main()
