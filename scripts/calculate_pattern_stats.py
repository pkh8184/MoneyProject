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


def combo_golden_events(ohlcv: dict) -> list[int]:
    """골든크로스 + 최근 3일 내 거래량 급증 조합."""
    gc = set(golden_cross_events(ohlcv))
    vs = set(volume_spike_events(ohlcv, k=1.5))
    if not gc or not vs:
        return []
    events = []
    for t in gc:
        for dt in range(-3, 4):
            if (t + dt) in vs:
                events.append(t)
                break
    return events


def v_shape_rebound_events(ohlcv: dict) -> list[int]:
    """최근 20일 저점에서 5% 이상 반등한 첫날."""
    close = ohlcv['close']
    n = len(close)
    if n < 25:
        return []
    events = []
    for t in range(20, n):
        low20 = min(close[t-20:t])
        if low20 <= 0:
            continue
        if close[t] >= low20 * 1.05 and close[t-1] < low20 * 1.05:
            events.append(t)
    return events


def alignment_events(ohlcv: dict) -> list[int]:
    """MA5 > MA20 > MA60 > MA120 정배열 첫 형성일."""
    close = ohlcv['close']
    n = len(close)
    if n < 125:
        return []
    def mas_at(t):
        return (
            sum(close[t-4:t+1]) / 5,
            sum(close[t-19:t+1]) / 20,
            sum(close[t-59:t+1]) / 60,
            sum(close[t-119:t+1]) / 120,
        )
    events = []
    for t in range(120, n):
        m5t, m20t, m60t, m120t = mas_at(t)
        m5y, m20y, m60y, m120y = mas_at(t - 1)
        aligned_t = m5t > m20t > m60t > m120t
        aligned_y = m5y > m20y > m60y > m120y
        if aligned_t and not aligned_y:
            events.append(t)
    return events


def ma60_turn_up_events(ohlcv: dict) -> list[int]:
    """MA60이 5일 연속 상승 전환한 첫날."""
    close = ohlcv['close']
    n = len(close)
    if n < 70:
        return []
    events = []
    for t in range(65, n):
        ma60 = [sum(close[t-59-i:t+1-i]) / 60 for i in range(5)]
        if ma60[0] > ma60[1] > ma60[2] > ma60[3] > ma60[4]:
            # 과거 10일 중엔 이런 패턴 아니었어야 함 (첫 전환)
            prev_ma60 = sum(close[t-64:t-4]) / 60
            if prev_ma60 > ma60[4]:  # 이전 평균이 현재보다 높았으면 최근에 하락 중이었음
                events.append(t)
    return events


def rsi_rebound_events(ohlcv: dict) -> list[int]:
    """RSI14가 30 아래로 내려갔다가 30 이상 재돌파 (과매도 반등)."""
    close = ohlcv['close']
    n = len(close)
    if n < 20:
        return []
    # RSI14 계산
    rsi = []
    for t in range(n):
        if t < 14:
            rsi.append(None)
            continue
        gains = 0
        losses = 0
        for i in range(t - 13, t + 1):
            if i == 0:
                continue
            diff = close[i] - close[i-1]
            if diff > 0:
                gains += diff
            else:
                losses -= diff
        if losses == 0:
            rsi.append(100)
        else:
            rs = gains / losses
            rsi.append(100 - 100 / (1 + rs))
    events = []
    for t in range(15, n):
        if rsi[t-1] is None or rsi[t] is None:
            continue
        if rsi[t-1] < 30 and rsi[t] >= 30:
            events.append(t)
    return events


def macd_cross_events(ohlcv: dict) -> list[int]:
    """MACD 라인이 시그널 상향 돌파 (근사: EMA12 - EMA26 > signal EMA9)."""
    close = ohlcv['close']
    n = len(close)
    if n < 40:
        return []
    # EMA 계산 헬퍼
    def ema(period: int) -> list[float]:
        k = 2 / (period + 1)
        out = [close[0]]
        for i in range(1, n):
            out.append(close[i] * k + out[i-1] * (1 - k))
        return out
    ema12 = ema(12)
    ema26 = ema(26)
    macd_line = [ema12[i] - ema26[i] for i in range(n)]
    # signal = EMA9 of macd_line
    k = 2 / (9 + 1)
    signal = [macd_line[0]]
    for i in range(1, n):
        signal.append(macd_line[i] * k + signal[i-1] * (1 - k))
    events = []
    for t in range(27, n):
        if macd_line[t-1] <= signal[t-1] and macd_line[t] > signal[t]:
            events.append(t)
    return events


def prev_high_break_events(ohlcv: dict) -> list[int]:
    """최근 60일 신고가 돌파 (전일 종가 < 60일 최고, 오늘 >= 60일 최고)."""
    close = ohlcv['close']
    n = len(close)
    if n < 65:
        return []
    events = []
    for t in range(60, n):
        high60 = max(close[t-60:t])
        if close[t-1] < high60 and close[t] >= high60:
            events.append(t)
    return events


def high_52w_events(ohlcv: dict) -> list[int]:
    """52주(250거래일) 신고가 돌파."""
    close = ohlcv['close']
    n = len(close)
    if n < 251:
        return []
    events = []
    for t in range(250, n):
        high_52w = max(close[t-250:t])
        if close[t-1] < high_52w and close[t] >= high_52w:
            events.append(t)
    return events


def macd_hist_positive_events(ohlcv: dict) -> list[int]:
    """MACD 히스토그램 음→양 전환."""
    close = ohlcv['close']
    n = len(close)
    if n < 40:
        return []
    def ema(period: int) -> list[float]:
        k = 2 / (period + 1)
        out = [close[0]]
        for i in range(1, n):
            out.append(close[i] * k + out[i-1] * (1 - k))
        return out
    ema12 = ema(12)
    ema26 = ema(26)
    macd_line = [ema12[i] - ema26[i] for i in range(n)]
    k = 2 / (9 + 1)
    signal = [macd_line[0]]
    for i in range(1, n):
        signal.append(macd_line[i] * k + signal[i-1] * (1 - k))
    hist = [macd_line[i] - signal[i] for i in range(n)]
    events = []
    for t in range(27, n):
        if hist[t-1] <= 0 and hist[t] > 0:
            events.append(t)
    return events


def bb_lower_bounce_events(ohlcv: dict) -> list[int]:
    """볼린저 하단 터치 후 반등 이벤트 (combo_value_rebound 근사)."""
    close = ohlcv['close']
    n = len(close)
    if n < 25:
        return []
    import math
    events = []
    for t in range(20, n):
        window = close[t-19:t+1]
        mean = sum(window) / 20
        var = sum((x - mean) ** 2 for x in window) / 20
        std = math.sqrt(var)
        bb_lower = mean - 2 * std
        # 어제 하단 터치, 오늘 반등
        if close[t-1] <= bb_lower and close[t] > close[t-1]:
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
    """이벤트 시점별 D+1/D+3/D+7/D+14 수익률 집계."""
    close = ohlcv['close']
    n = len(close)
    r1, r3, r7, r14 = [], [], [], []
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
        if t + 14 < n:
            r14.append((close[t+14] - c0) / c0 * 100)
    return {
        'sample_count': len(events),
        'd1': compute_return_stat(r1),
        'd3': compute_return_stat(r3),
        'd7': compute_return_stat(r7),
        'd14': compute_return_stat(r14)
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
    # 프리셋 ID → event detector 함수 매핑
    # 주의: 여기의 키는 src/lib/presets/registry.ts의 preset.id와 일치해야 함
    detectors = {
        'volume_spike':    lambda oh: volume_spike_events(oh, k=1.5),
        'golden_cross':    golden_cross_events,
        'combo_golden':    combo_golden_events,
        'v_shape_rebound': v_shape_rebound_events,
        'alignment':       alignment_events,
        'ma60_turn_up':    ma60_turn_up_events,
        'combo_value_rebound': bb_lower_bounce_events,
        'bb_lower_bounce': bb_lower_bounce_events,
    }

    for code, ohlcv in ohlcv_all.items():
        stats_for_stock = {}
        for preset_id, detector in detectors.items():
            try:
                events = detector(ohlcv)
            except Exception:
                events = []
            if len(events) >= MIN_SAMPLE:
                stats_for_stock[preset_id] = aggregate_events(ohlcv, events)

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
