import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from bowl_volume import analyze_bowl_volume, compute_bowl_volume_score


def make_ohlcv(opens, closes, volumes):
    return {'open': list(opens), 'close': list(closes), 'volume': list(volumes)}


def test_dryup_detected_when_p2_much_smaller_than_p1():
    # 저점 인덱스 40, P1(0~30): 100만, P2(30~50): 30만, P3(-5:): 80만
    opens = [100] * 90
    closes = [100] * 90
    volumes = [1_000_000] * 30 + [300_000] * 20 + [1_000_000] * 35 + [800_000] * 5
    r = analyze_bowl_volume(make_ohlcv(opens, closes, volumes), low_idx=40)
    assert r['bowl_vol_dryup_ratio'] is not None
    assert r['bowl_vol_dryup_ratio'] < 0.5


def test_explosion_detected_when_p3_2x_p2():
    opens = [100] * 90
    closes = [100] * 90
    volumes = [1_000_000] * 30 + [500_000] * 50 + [1_500_000] * 5 + [1_500_000] * 5
    r = analyze_bowl_volume(make_ohlcv(opens, closes, volumes), low_idx=50)
    assert r['bowl_vol_explosion_ratio'] is not None
    assert r['bowl_vol_explosion_ratio'] >= 2.0


def test_value_expansion_reflects_price_change():
    # P2 가격 100, P3 가격 150. 거래량 같음. 거래대금 1.5배.
    opens = [100] * 90
    closes = [100] * 85 + [150] * 5
    volumes = [1_000_000] * 90
    r = analyze_bowl_volume(make_ohlcv(opens, closes, volumes), low_idx=50)
    assert r['bowl_value_expansion_ratio'] is not None
    assert 1.4 <= r['bowl_value_expansion_ratio'] <= 1.6


def test_accumulation_bars_count():
    # P2 구간(30~50)에 거래량 2배 양봉 3개
    opens = [100] * 90
    closes = [100] * 90
    volumes = [1_000_000] * 90
    # 기준: P2 전 20일 평균 = 100만 → 2배 = 200만
    for i in [35, 40, 45]:
        volumes[i] = 2_500_000
        closes[i] = 110  # 양봉 (close > open)
    r = analyze_bowl_volume(make_ohlcv(opens, closes, volumes), low_idx=40)
    assert r['bowl_accumulation_bars'] == 3


def test_accumulation_bars_ignores_bearish_or_low_volume():
    opens = [100] * 90
    closes = [100] * 90
    volumes = [1_000_000] * 90
    volumes[35] = 2_500_000
    closes[35] = 90  # 음봉 → 제외
    volumes[40] = 1_500_000  # 2배 미만 → 제외
    closes[40] = 110
    r = analyze_bowl_volume(make_ohlcv(opens, closes, volumes), low_idx=40)
    assert r['bowl_accumulation_bars'] == 0


def test_volume_slope_positive_for_rising_volume():
    opens = [100] * 90
    closes = [100] * 90
    # 거래량이 선형 증가
    volumes = [100_000 + i * 10_000 for i in range(90)]
    r = analyze_bowl_volume(make_ohlcv(opens, closes, volumes), low_idx=40)
    assert r['bowl_volume_slope'] is not None
    assert r['bowl_volume_slope'] > 0.005


def test_volume_slope_negative_for_falling_volume():
    opens = [100] * 90
    closes = [100] * 90
    volumes = [1_000_000 - i * 8_000 for i in range(90)]
    r = analyze_bowl_volume(make_ohlcv(opens, closes, volumes), low_idx=40)
    assert r['bowl_volume_slope'] < 0


def test_insufficient_data_returns_none_fields():
    ohlcv = make_ohlcv([100]*10, [100]*10, [1000]*10)
    r = analyze_bowl_volume(ohlcv, low_idx=5)
    # 데이터 부족해도 크래시 안 남
    assert isinstance(r, dict)


def test_score_maximum_full_conditions():
    metrics = {
        'bowl_vol_dryup_ratio': 0.4,
        'bowl_vol_explosion_ratio': 2.5,
        'bowl_value_expansion_ratio': 2.2,
        'bowl_accumulation_bars': 4,
        'bowl_volume_slope': 0.02
    }
    score = compute_bowl_volume_score(metrics, foreign_accumulation=0.7)
    assert score == 100


def test_score_low_for_poor_conditions():
    metrics = {
        'bowl_vol_dryup_ratio': 1.2,
        'bowl_vol_explosion_ratio': 1.0,
        'bowl_value_expansion_ratio': 1.0,
        'bowl_accumulation_bars': 0,
        'bowl_volume_slope': -0.01
    }
    score = compute_bowl_volume_score(metrics, foreign_accumulation=0.2)
    assert score <= 10


def test_score_foreign_none_still_works():
    metrics = {
        'bowl_vol_dryup_ratio': 0.5,
        'bowl_vol_explosion_ratio': 1.9,
        'bowl_value_expansion_ratio': 1.6,
        'bowl_accumulation_bars': 2,
        'bowl_volume_slope': 0.012
    }
    score = compute_bowl_volume_score(metrics, foreign_accumulation=None)
    # 외국인 빼고 최대 95점 가능
    assert 50 <= score <= 95


def test_score_all_none_returns_zero():
    metrics = {k: None for k in ['bowl_vol_dryup_ratio', 'bowl_vol_explosion_ratio',
                                  'bowl_value_expansion_ratio', 'bowl_volume_slope']}
    metrics['bowl_accumulation_bars'] = 0
    assert compute_bowl_volume_score(metrics, None) == 0
