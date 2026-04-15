"""밥그릇 패턴 거래량 심화 분석 모듈.

현재 종목의 최근 90일 OHLCV와 저점 상대 인덱스(low_idx)를 입력받아
6개 측정치 (5개 기술적 + foreign)로 품질 점수 0~100을 계산.
"""
from typing import Optional
import numpy as np


def _safe_mean(arr) -> Optional[float]:
    # Drop None / NaN values
    clean = [x for x in arr if x is not None and (not isinstance(x, float) or not np.isnan(x))]
    if not clean:
        return None
    return sum(clean) / len(clean)


def analyze_bowl_volume(ohlcv: dict, low_idx: int) -> dict:
    opens = ohlcv.get('open', [])
    closes = ohlcv.get('close', [])
    volumes = ohlcv.get('volume', [])
    n = len(closes)

    result = {
        'bowl_vol_dryup_ratio': None,
        'bowl_vol_explosion_ratio': None,
        'bowl_value_expansion_ratio': None,
        'bowl_accumulation_bars': 0,
        'bowl_volume_slope': None
    }

    if n < 20:
        return result

    # 1. Dry-up: P2(저점 ±10) / P1(저점 -60 ~ -30)
    p1_start = max(0, low_idx - 60)
    p1_end = max(0, low_idx - 30)
    p2_start = max(0, low_idx - 10)
    p2_end = min(n, low_idx + 10)
    p1_mean = _safe_mean(volumes[p1_start:p1_end])
    p2_mean = _safe_mean(volumes[p2_start:p2_end])
    if p1_mean and p1_mean > 0 and p2_mean is not None:
        result['bowl_vol_dryup_ratio'] = round(p2_mean / p1_mean, 3)

    # 2. Explosion: P3(최근 5일) / P2
    p3_mean = _safe_mean(volumes[-5:]) if n >= 5 else None
    if p2_mean and p2_mean > 0 and p3_mean is not None:
        result['bowl_vol_explosion_ratio'] = round(p3_mean / p2_mean, 3)

    # 3. Value expansion: 거래대금 P3 / P2
    values = [c * v for c, v in zip(closes, volumes)]
    p2_val_mean = _safe_mean(values[p2_start:p2_end])
    p3_val_mean = _safe_mean(values[-5:])
    if p2_val_mean and p2_val_mean > 0 and p3_val_mean is not None:
        result['bowl_value_expansion_ratio'] = round(p3_val_mean / p2_val_mean, 3)

    # 4. Accumulation bars (양봉 + 거래량 2배)
    ref_start = max(0, p2_start - 20)
    vol_ref = _safe_mean(volumes[ref_start:p2_start]) if p2_start > ref_start else None
    acc = 0
    if vol_ref and vol_ref > 0:
        for i in range(p2_start, p2_end):
            if i < 0 or i >= n:
                continue
            if closes[i] > opens[i] and volumes[i] >= vol_ref * 2:
                acc += 1
    result['bowl_accumulation_bars'] = acc

    # 5. Volume slope (선형 회귀, 정규화)
    start = max(0, low_idx - 60)
    y = np.array(volumes[start:], dtype=float)
    if len(y) >= 20:
        x = np.arange(len(y))
        try:
            s, _ = np.polyfit(x, y, 1)
            mean_y = y.mean()
            if mean_y > 0:
                result['bowl_volume_slope'] = round(float(s / mean_y), 4)
        except Exception:
            pass

    return result


def compute_bowl_volume_score(metrics: dict, foreign_accumulation: Optional[float] = None) -> int:
    """0~100 점수 계산."""
    score = 0

    dryup = metrics.get('bowl_vol_dryup_ratio')
    if dryup is not None:
        if dryup < 0.6:
            score += 30
        elif dryup < 0.8:
            score += 20
        elif dryup < 1.0:
            score += 10

    exp = metrics.get('bowl_vol_explosion_ratio')
    if exp is not None:
        if exp >= 2.0:
            score += 25
        elif exp >= 1.5:
            score += 18
        elif exp >= 1.3:
            score += 10

    val_exp = metrics.get('bowl_value_expansion_ratio')
    if val_exp is not None:
        if val_exp >= 2.0:
            score += 15
        elif val_exp >= 1.5:
            score += 10

    acc = metrics.get('bowl_accumulation_bars') or 0
    if acc >= 3:
        score += 15
    elif acc == 2:
        score += 10
    elif acc == 1:
        score += 5

    slope = metrics.get('bowl_volume_slope')
    if slope is not None:
        if slope > 0.015:
            score += 10
        elif slope > 0.005:
            score += 6

    if foreign_accumulation is not None:
        if foreign_accumulation >= 0.6:
            score += 5
        elif foreign_accumulation >= 0.4:
            score += 3

    return min(100, score)
