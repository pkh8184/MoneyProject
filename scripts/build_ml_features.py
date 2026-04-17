"""ML 훈련·예측용 피처 생성.
입력: ohlcv/{code}.json, fundamentals.json, sectors.json,
      macro_indicators.json, historical_macro.json,
      sector_rotation.json, (optional) factor_backtest_results.json
출력:
  - public/data/ml_features.parquet (전체 역사 — 훈련용)
  - public/data/ml_features_today.parquet (오늘 예측용)
"""
import json
import sys
from pathlib import Path
from datetime import datetime
import pytz

import pandas as pd
import numpy as np

DATA_DIR = Path(__file__).resolve().parent.parent / 'public' / 'data'
KST = pytz.timezone('Asia/Seoul')


def load_json(name: str):
    path = DATA_DIR / name
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding='utf-8'))


def load_ohlcv(code: str) -> dict | None:
    path = DATA_DIR / 'ohlcv' / f'{code}.json'
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception:
        return None


def compute_tech_features(oh: dict, idx: int) -> dict | None:
    """개별 인덱스의 기술 지표 피처."""
    closes = oh.get('close') or []
    highs = oh.get('high') or closes
    lows = oh.get('low') or closes
    volumes = oh.get('volume') or []
    if idx < 120 or idx >= len(closes):
        return None
    close = closes[idx]
    if not close or close <= 0:
        return None

    # MAs
    ma5 = np.mean(closes[idx - 4:idx + 1])
    ma20 = np.mean(closes[idx - 19:idx + 1])
    ma60 = np.mean(closes[idx - 59:idx + 1])
    ma120 = np.mean(closes[idx - 119:idx + 1])

    # RSI14
    delta = np.diff(closes[max(0, idx - 14):idx + 1])
    gains = delta[delta > 0].sum() if len(delta) > 0 else 0
    losses = -delta[delta < 0].sum() if len(delta) > 0 else 0
    rsi = 100 - (100 / (1 + gains / losses)) if losses > 0 else 50

    # Bollinger Band position
    ma20_std = np.std(closes[idx - 19:idx + 1])
    bb_upper = ma20 + 2 * ma20_std
    bb_lower = ma20 - 2 * ma20_std
    bb_position = (close - bb_lower) / (bb_upper - bb_lower) if bb_upper > bb_lower else 0.5

    # Volume ratio (vs 20d avg)
    vol_20 = np.mean(volumes[idx - 19:idx + 1]) if len(volumes) > idx else 1
    cur_vol = volumes[idx] if idx < len(volumes) else 1
    vol_ratio = cur_vol / vol_20 if vol_20 > 0 else 1

    # 5d return
    ret_5d = (close - closes[idx - 5]) / closes[idx - 5] * 100 if closes[idx - 5] > 0 else 0

    # 20d volatility (std of daily returns)
    daily_rets = np.diff(closes[idx - 19:idx + 1]) / closes[idx - 20:idx] if idx >= 20 else np.array([0])
    volatility = np.std(daily_rets) * 100

    return {
        'close_vs_ma5': (close - ma5) / ma5 if ma5 > 0 else 0,
        'close_vs_ma20': (close - ma20) / ma20 if ma20 > 0 else 0,
        'close_vs_ma60': (close - ma60) / ma60 if ma60 > 0 else 0,
        'close_vs_ma120': (close - ma120) / ma120 if ma120 > 0 else 0,
        'ma5_vs_ma20': (ma5 - ma20) / ma20 if ma20 > 0 else 0,
        'ma20_vs_ma60': (ma20 - ma60) / ma60 if ma60 > 0 else 0,
        'rsi14': rsi,
        'bb_position': bb_position,
        'volume_ratio': vol_ratio,
        'return_5d': ret_5d,
        'volatility_20d': volatility,
        'macd_hist': 0,  # 간단화: 0 (향후 정식 계산)
    }


def compute_target(oh: dict, kospi_closes: list[float], kospi_dates: list[str], idx: int, date: str) -> int | None:
    """D+20 KOSPI 초과수익 +5% 이진 타겟."""
    closes = oh['close']
    if idx + 20 >= len(closes):
        return None
    stock_ret = (closes[idx + 20] - closes[idx]) / closes[idx]
    # 같은 날짜 KOSPI 인덱스 찾기
    try:
        k_idx = kospi_dates.index(date)
    except ValueError:
        return None
    if k_idx + 20 >= len(kospi_closes):
        return None
    kospi_ret = (kospi_closes[k_idx + 20] - kospi_closes[k_idx]) / kospi_closes[k_idx]
    return 1 if (stock_ret - kospi_ret) >= 0.05 else 0


def build_features_historical():
    """5년 역사 피처 + 타겟 생성."""
    stocks = load_json('stocks.json')
    sectors = load_json('sectors.json') or {}
    fundamentals = load_json('fundamentals.json') or {}
    historical = load_json('historical_macro.json')
    rotation = load_json('sector_rotation.json')
    if not stocks:
        print('[ERROR] stocks.json missing', file=sys.stderr)
        sys.exit(1)
    if not historical:
        print('[ERROR] historical_macro.json missing (run fetch_historical_macro.py first)', file=sys.stderr)
        sys.exit(1)

    kospi_series = historical.get('kospi') or []
    kospi_dates = [e['date'] for e in kospi_series]
    kospi_closes = [e['close'] for e in kospi_series]

    rows = []
    for s in stocks.get('stocks', []):
        code = s['code']
        name = s['name']
        oh = load_ohlcv(code)
        if not oh:
            continue
        dates = oh.get('dates') or []
        closes = oh.get('close') or []
        if len(closes) < 150:
            continue
        themes = (sectors.get(code) or {}).get('themes') or []
        fund = fundamentals.get(code) or {}
        per = fund.get('per')
        pbr = fund.get('pbr')
        market_cap = fund.get('market_cap') or 0
        foreign_net = fund.get('foreign_net') or []
        institution_net = fund.get('institution_net') or []

        # 섹터 로테이션 (단일 값 — 오늘 기준. 과거엔 정확하진 않지만 proxy)
        rot_delta = 0
        if rotation and themes:
            for t in themes:
                match = next((s for s in rotation.get('sectors', []) if s['theme'] == t), None)
                if match:
                    if match['rank'] == 'strong':
                        rot_delta = 3
                    elif match['rank'] == 'weak':
                        rot_delta = -3
                    break

        # 5일 간격 샘플링
        for idx in range(120, len(closes), 5):
            tech = compute_tech_features(oh, idx)
            if not tech:
                continue
            target = compute_target(oh, kospi_closes, kospi_dates, idx, dates[idx])
            if target is None:
                continue
            row = {
                'date': dates[idx],
                'code': code,
                **tech,
                # 펀더멘털 (일부는 시점 고정 — 완벽하지 않지만 근사)
                'per': per if per is not None else 15,
                'pbr': pbr if pbr is not None else 1.5,
                'log_market_cap': np.log(max(market_cap, 1e6)),
                'foreign_net_ratio_10d': len([x for x in foreign_net[-10:] if x > 0]) / max(len(foreign_net[-10:]), 1),
                'institution_net_ratio_10d': len([x for x in institution_net[-10:] if x > 0]) / max(len(institution_net[-10:]), 1),
                # 매크로 placeholder
                'sector_rotation_delta': rot_delta,
                'theme_count': len(themes),
                'active_factor_count': 0,  # 역사적 팩터는 복잡 — 간단화
                'macro_bonus_for_stock': 0,
                'kospi_5d_return': 0,
                'krw_20d_change': 0,
                'oil_20d_change': 0,
                # 밥그릇 placeholder (현재 시점 ohlcv에만 있음)
                'bowl_volume_score': 0,
                'bowl_sideways_days_ratio': 0,
                'bowl_ma_convergence_min': 0,
                'bowl_phase': 0,
                'bowl_low_was_inverted': 0,
                'bowl_has_recent_golden_cross': 0,
                # 프리셋 placeholder
                'matched_presets_count': 0,
                'has_golden_cross': 0,
                'has_bowl_pattern': 0,
                'has_volume_spike': 0,
                'has_alignment': 0,
                'target': target
            }
            rows.append(row)

    if not rows:
        print('[ERROR] No features built. Check data files.', file=sys.stderr)
        sys.exit(1)

    df = pd.DataFrame(rows)
    out = DATA_DIR / 'ml_features.parquet'
    df.to_parquet(out, index=False)
    print(f'[INFO] ml_features.parquet saved: {len(df)} rows, {df["target"].mean():.2%} positive rate')


def build_features_today():
    """오늘 예측용 피처 (최신 시점만, target 없음)."""
    stocks = load_json('stocks.json')
    sectors = load_json('sectors.json') or {}
    fundamentals = load_json('fundamentals.json') or {}
    rotation = load_json('sector_rotation.json')
    if not stocks:
        sys.exit(1)

    rows = []
    for s in stocks.get('stocks', []):
        code = s['code']
        oh = load_ohlcv(code)
        if not oh:
            continue
        dates = oh.get('dates') or []
        closes = oh.get('close') or []
        if len(closes) < 150:
            continue
        idx = len(closes) - 1
        tech = compute_tech_features(oh, idx)
        if not tech:
            continue

        themes = (sectors.get(code) or {}).get('themes') or []
        fund = fundamentals.get(code) or {}
        per = fund.get('per')
        pbr = fund.get('pbr')
        market_cap = fund.get('market_cap') or 0
        foreign_net = fund.get('foreign_net') or []
        institution_net = fund.get('institution_net') or []

        rot_delta = 0
        if rotation and themes:
            for t in themes:
                match = next((s for s in rotation.get('sectors', []) if s['theme'] == t), None)
                if match:
                    if match['rank'] == 'strong':
                        rot_delta = 3
                    elif match['rank'] == 'weak':
                        rot_delta = -3
                    break

        row = {
            'date': dates[idx],
            'code': code,
            **tech,
            'per': per if per is not None else 15,
            'pbr': pbr if pbr is not None else 1.5,
            'log_market_cap': np.log(max(market_cap, 1e6)),
            'foreign_net_ratio_10d': len([x for x in foreign_net[-10:] if x > 0]) / max(len(foreign_net[-10:]), 1),
            'institution_net_ratio_10d': len([x for x in institution_net[-10:] if x > 0]) / max(len(institution_net[-10:]), 1),
            'sector_rotation_delta': rot_delta,
            'theme_count': len(themes),
            'active_factor_count': 0,
            'macro_bonus_for_stock': 0,
            'kospi_5d_return': 0,
            'krw_20d_change': 0,
            'oil_20d_change': 0,
            'bowl_volume_score': 0,
            'bowl_sideways_days_ratio': 0,
            'bowl_ma_convergence_min': 0,
            'bowl_phase': 0,
            'bowl_low_was_inverted': 0,
            'bowl_has_recent_golden_cross': 0,
            'matched_presets_count': 0,
            'has_golden_cross': 0,
            'has_bowl_pattern': 0,
            'has_volume_spike': 0,
            'has_alignment': 0
        }
        rows.append(row)

    df = pd.DataFrame(rows)
    out = DATA_DIR / 'ml_features_today.parquet'
    df.to_parquet(out, index=False)
    print(f'[INFO] ml_features_today.parquet saved: {len(df)} rows')


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else 'both'
    if mode in ('historical', 'both'):
        build_features_historical()
    if mode in ('today', 'both'):
        build_features_today()


if __name__ == '__main__':
    main()
