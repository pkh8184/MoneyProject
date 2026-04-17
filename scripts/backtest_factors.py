"""팩터 백테스트 엔진.
입력: historical_macro.json, ohlcv/{code}.json × N, sectors.json, fundamentals.json
출력:
  - public/data/factor_backtest_results.json (팩터별 통계)
  - public/data/stock_macro_response.json (대형주 × 팩터 반응도)
"""
import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional
import pytz

DATA_DIR = Path(__file__).resolve().parent.parent / 'public' / 'data'
KST = pytz.timezone('Asia/Seoul')

# ---------- 팩터 정의 (Phase 13+14와 동기화) ----------
# 자동 탐지 팩터: 매크로 지표 임계값으로 활성 날짜 식별
AUTO_FACTORS = {
    'krw_weak':     {'kind': 'forex', 'op': '>=', 'threshold': 3.0},
    'krw_strong':   {'kind': 'forex', 'op': '<=', 'threshold': -3.0},
    'oil_up':       {'kind': 'oil', 'op': '>=', 'threshold': 10.0},
    'oil_down':     {'kind': 'oil', 'op': '<=', 'threshold': -10.0},
    'kospi_crash':  {'kind': 'kospi_special', 'd5_threshold': -3.0, 'ma20_threshold': -5.0}
}

# 수동 지정 팩터: 역사적 기간
MANUAL_PERIODS = {
    'war_ongoing':   [('2022-02-24', None)],
    'us_china':      [('2018-07-06', None)],
    'rate_hike':     [('2022-01-01', '2023-07-31')],
    'rate_cut':      [('2024-10-01', None)],
    'ai_boom':       [('2023-01-01', None)],
    'ev_boom':       [('2020-01-01', '2022-12-31')],
    'bio_boom':      [('2020-03-01', '2021-06-30')],
    'defense_boom':  [('2022-06-01', None)],
    'inflation':     [('2021-06-01', '2023-06-30')]
}

# 팩터 수혜/피해 매핑 (Phase 13+14 factors.ts와 동기화)
# 각 팩터: {'beneficiaries': {'themes': [...], 'nameKeywords': [...]}, 'losers': {...}}
FACTOR_IMPACTS = {
    'krw_weak': {
        'beneficiaries': {'themes': ['반도체', '전기차', '2차전지'],
                          'nameKeywords': ['현대차', '기아', '현대중공업']},
        'losers': {'themes': ['항공·여행', '유통']}
    },
    'krw_strong': {
        'beneficiaries': {'themes': ['항공·여행', '유통']},
        'losers': {'themes': ['반도체'], 'nameKeywords': ['현대차', '기아']}
    },
    'oil_up': {
        'beneficiaries': {'themes': ['정유·에너지'], 'nameKeywords': ['S-Oil', 'GS', 'SK이노베이션']},
        'losers': {'themes': ['항공·여행', '해운·물류']}
    },
    'oil_down': {
        'beneficiaries': {'themes': ['항공·여행', '해운·물류']},
        'losers': {'themes': ['정유·에너지']}
    },
    'kospi_crash': {
        'beneficiaries': {'themes': ['전력·가스', '통신', '담배'], 'nameKeywords': ['KT&G']},
        'losers': {'themes': ['AI', '바이오']}
    },
    'war_ongoing': {
        'beneficiaries': {'themes': ['방산', '정유·에너지'], 'nameKeywords': ['고려아연', '풍산']},
        'losers': {'themes': ['항공·여행']}
    },
    'us_china': {
        'beneficiaries': {'themes': ['반도체']},
        'losers': {'nameKeywords': ['LG생활건강', '아모레퍼시픽', '코스맥스']}
    },
    'rate_hike': {
        'beneficiaries': {'themes': ['금융']},
        'losers': {'themes': ['AI', '바이오', '건설']}
    },
    'rate_cut': {
        'beneficiaries': {'themes': ['AI', '바이오', '건설']},
        'losers': {'themes': ['금융']}
    },
    'ai_boom': {
        'beneficiaries': {'themes': ['AI', '반도체'], 'nameKeywords': ['SK하이닉스', '한미반도체']},
        'losers': {}
    },
    'ev_boom': {
        'beneficiaries': {'themes': ['전기차', '2차전지']},
        'losers': {}
    },
    'bio_boom': {
        'beneficiaries': {'themes': ['바이오']},
        'losers': {}
    },
    'defense_boom': {
        'beneficiaries': {'themes': ['방산']},
        'losers': {}
    },
    'inflation': {
        'beneficiaries': {'themes': ['정유·에너지', '식품·음료', '철강·비철금속']},
        'losers': {'themes': ['AI', '바이오']}
    }
}

# 대형주 (종목 코드 → 이름) — per-stock 반응도 계산 대상 30개
LARGE_CAPS = {
    '005930': '삼성전자', '000660': 'SK하이닉스', '005380': '현대차',
    '000270': '기아', '051910': 'LG화학', '006400': '삼성SDI',
    '035420': 'NAVER', '035720': '카카오', '068270': '셀트리온',
    '207940': '삼성바이오로직스', '005490': 'POSCO홀딩스',
    '373220': 'LG에너지솔루션', '096770': 'SK이노베이션',
    '012330': '현대모비스', '028260': '삼성물산',
    '066570': 'LG전자', '003550': 'LG',
    '017670': 'SK텔레콤', '030200': 'KT',
    '015760': '한국전력', '033780': 'KT&G',
    '105560': 'KB금융', '055550': '신한지주',
    '086790': '하나금융지주', '010130': '고려아연',
    '010950': 'S-Oil', '034730': 'SK',
    '018260': '삼성에스디에스', '011200': 'HMM',
    '267250': 'HD현대중공업'
}


def load_json(name: str):
    path = DATA_DIR / name
    if not path.exists():
        print(f'[WARN] {name} not found', file=sys.stderr)
        return None
    return json.loads(path.read_text(encoding='utf-8'))


def load_ohlcv(code: str) -> dict | None:
    """개별 종목 OHLCV 파일 로드 (ohlcv/{code}.json)."""
    path = DATA_DIR / 'ohlcv' / f'{code}.json'
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception:
        return None


# ---------- 자동 팩터 활성 기간 식별 ----------
def pct_change(series: list[dict], idx: int, lookback: int) -> Optional[float]:
    if idx < lookback:
        return None
    cur = series[idx]['close']
    ref = series[idx - lookback]['close']
    if ref <= 0:
        return None
    return ((cur - ref) / ref) * 100


def ma(series: list[dict], idx: int, window: int) -> Optional[float]:
    if idx < window - 1:
        return None
    vals = [series[i]['close'] for i in range(idx - window + 1, idx + 1)]
    return sum(vals) / window


def identify_auto_factor_dates(historical: dict) -> dict[str, list[str]]:
    """자동 탐지 팩터별 활성 날짜 리스트."""
    result = {fid: [] for fid in AUTO_FACTORS}
    forex = historical.get('forex_usd_krw') or []
    oil = historical.get('oil_wti') or []
    kospi = historical.get('kospi') or []

    for i, entry in enumerate(forex):
        d20 = pct_change(forex, i, 20)
        if d20 is None:
            continue
        if d20 >= 3.0:
            result['krw_weak'].append(entry['date'])
        elif d20 <= -3.0:
            result['krw_strong'].append(entry['date'])

    for i, entry in enumerate(oil):
        d20 = pct_change(oil, i, 20)
        if d20 is None:
            continue
        if d20 >= 10.0:
            result['oil_up'].append(entry['date'])
        elif d20 <= -10.0:
            result['oil_down'].append(entry['date'])

    for i, entry in enumerate(kospi):
        d5 = pct_change(kospi, i, 5)
        m20 = ma(kospi, i, 20)
        vs_ma = ((entry['close'] - m20) / m20 * 100) if m20 else None
        if (d5 is not None and d5 <= -3.0) or (vs_ma is not None and vs_ma <= -5.0):
            result['kospi_crash'].append(entry['date'])

    return result


def identify_manual_factor_dates(trade_dates: list[str]) -> dict[str, list[str]]:
    """수동 지정 기간 → 거래일 리스트로 변환."""
    result = {}
    for fid, periods in MANUAL_PERIODS.items():
        dates = []
        for start, end in periods:
            end_str = end or '9999-99-99'
            for d in trade_dates:
                if start <= d <= end_str:
                    dates.append(d)
        result[fid] = dates
    return result


# ---------- 종목군 매칭 ----------
def matches(stock_name: str, themes: list[str], impact: dict) -> bool:
    m_themes = impact.get('themes') or []
    m_names = impact.get('nameKeywords') or []
    for t in m_themes:
        if t in (themes or []):
            return True
    for kw in m_names:
        if kw in stock_name:
            return True
    return False


# ---------- 종목 수익률 계산 ----------
def compute_returns_from_date(
    ohlcv_map: dict[str, dict],
    code: str,
    start_date: str,
    holds: list[int]
) -> dict[int, Optional[float]]:
    """code 종목의 start_date 기준 D+N 수익률."""
    oh = ohlcv_map.get(code)
    if not oh or 'dates' not in oh or 'close' not in oh:
        return {h: None for h in holds}
    dates = oh['dates']
    closes = oh['close']
    # start_date 이후 첫 거래일 인덱스
    try:
        idx = next(i for i, d in enumerate(dates) if d >= start_date)
    except StopIteration:
        return {h: None for h in holds}
    if idx >= len(closes):
        return {h: None for h in holds}
    base_close = closes[idx]
    if not base_close or base_close <= 0:
        return {h: None for h in holds}
    result = {}
    for h in holds:
        target_idx = idx + h
        if target_idx >= len(closes):
            result[h] = None
            continue
        tc = closes[target_idx]
        if not tc:
            result[h] = None
        else:
            result[h] = ((tc - base_close) / base_close) * 100
    return result


# ---------- 통계 집계 ----------
def mean_or_none(xs: list[float]) -> Optional[float]:
    xs = [x for x in xs if x is not None]
    if not xs:
        return None
    return sum(xs) / len(xs)


def stddev(xs: list[float]) -> Optional[float]:
    xs = [x for x in xs if x is not None]
    n = len(xs)
    if n < 2:
        return None
    m = sum(xs) / n
    return (sum((x - m) ** 2 for x in xs) / (n - 1)) ** 0.5


def confidence_level(sample_size: int, effect: Optional[float], std: Optional[float]) -> str:
    if sample_size < 30:
        return 'low'
    if effect is None or std is None or std == 0:
        return 'low'
    # Z-score like: |effect| / (std / sqrt(n))
    stderr = std / (sample_size ** 0.5)
    z = abs(effect) / stderr if stderr > 0 else 0
    if z >= 3 and sample_size >= 100:
        return 'high'
    if z >= 2:
        return 'medium'
    return 'low'


# ---------- 메인 백테스트 루프 ----------
def run_backtest():
    print('[INFO] Loading data...')
    historical = load_json('historical_macro.json')
    sectors = load_json('sectors.json')
    stocks = load_json('stocks.json')

    if not historical or not sectors or not stocks:
        print('[ERROR] Missing required data files', file=sys.stderr)
        sys.exit(1)

    # 종목 메타 (code → {name, themes})
    code_to_meta = {}
    for s in stocks.get('stocks', []):
        code = s['code']
        code_to_meta[code] = {
            'name': s['name'],
            'themes': (sectors.get(code) or {}).get('themes') or []
        }

    # 전체 거래일 (KOSPI 기준)
    kospi_series = historical.get('kospi') or []
    trade_dates = [e['date'] for e in kospi_series]
    if not trade_dates:
        print('[ERROR] No KOSPI data', file=sys.stderr)
        sys.exit(1)

    # 팩터 활성 날짜 식별
    auto_dates = identify_auto_factor_dates(historical)
    manual_dates = identify_manual_factor_dates(trade_dates)
    all_factor_dates = {**auto_dates, **manual_dates}

    print(f'[INFO] Auto factors: {[(k, len(v)) for k, v in auto_dates.items()]}')
    print(f'[INFO] Manual factors: {[(k, len(v)) for k, v in manual_dates.items()]}')

    # OHLCV 로드 (대형주 + 샘플 — 부분 로드로 메모리 관리)
    print('[INFO] Loading OHLCV for large caps and sample...')
    ohlcv_map = {}
    large_cap_codes = set(LARGE_CAPS.keys())
    # 샘플링: 대형주 전부 + 다른 종목 300개 랜덤
    import random
    random.seed(42)
    all_codes = list(code_to_meta.keys())
    sample_codes = set(random.sample(all_codes, min(300, len(all_codes))))
    target_codes = large_cap_codes | sample_codes
    for code in target_codes:
        oh = load_ohlcv(code)
        if oh:
            ohlcv_map[code] = oh

    print(f'[INFO] Loaded OHLCV for {len(ohlcv_map)} stocks')

    HOLDS = [1, 5, 20]

    # 팩터별 집계
    factor_results = {}
    for fid, dates in all_factor_dates.items():
        if not dates:
            continue
        impacts = FACTOR_IMPACTS.get(fid)
        if not impacts:
            continue

        # 각 D+h에 대해 수혜/피해/중립 군 수익률 수집
        per_hold = {h: {'benefit': [], 'loss': [], 'neutral': []} for h in HOLDS}
        for d in dates:
            for code, meta in code_to_meta.items():
                if code not in ohlcv_map:
                    continue
                name = meta['name']
                themes = meta['themes']
                is_benefit = matches(name, themes, impacts.get('beneficiaries') or {})
                is_loss = matches(name, themes, impacts.get('losers') or {})
                if not is_benefit and not is_loss:
                    group = 'neutral'
                elif is_benefit and not is_loss:
                    group = 'benefit'
                elif is_loss and not is_benefit:
                    group = 'loss'
                else:
                    continue  # 모호: 건너뜀
                rets = compute_returns_from_date(ohlcv_map, code, d, HOLDS)
                for h in HOLDS:
                    if rets[h] is not None:
                        per_hold[h][group].append(rets[h])

        # 팩터 결과
        per_hold_summary = {}
        for h in HOLDS:
            data = per_hold[h]
            benefit_avg = mean_or_none(data['benefit'])
            loss_avg = mean_or_none(data['loss'])
            neutral_avg = mean_or_none(data['neutral'])
            effect = (benefit_avg - neutral_avg) if benefit_avg is not None and neutral_avg is not None else None
            anti_effect = (loss_avg - neutral_avg) if loss_avg is not None and neutral_avg is not None else None
            per_hold_summary[f'd{h}'] = {
                'benefit_avg': round(benefit_avg, 3) if benefit_avg is not None else None,
                'loss_avg': round(loss_avg, 3) if loss_avg is not None else None,
                'neutral_avg': round(neutral_avg, 3) if neutral_avg is not None else None,
                'effect_benefit': round(effect, 3) if effect is not None else None,
                'effect_loss': round(anti_effect, 3) if anti_effect is not None else None,
                'sample_benefit': len(data['benefit']),
                'sample_loss': len(data['loss']),
                'sample_neutral': len(data['neutral'])
            }

        # 신뢰도 + 권장 weight (D+5 기준)
        d5 = per_hold_summary['d5']
        sample = d5['sample_benefit']
        effect_val = d5['effect_benefit']
        # std 근사 (효과 크기 기준)
        b_std = stddev(per_hold[5]['benefit'])
        conf = confidence_level(sample, effect_val, b_std)

        def weight_from_effect(eff: Optional[float], conf_lv: str) -> int:
            if conf_lv == 'low' or eff is None:
                return 3
            abs_e = abs(eff)
            if abs_e >= 5.0:
                return 10
            if abs_e >= 3.0:
                return 8
            if abs_e >= 1.5:
                return 7
            if abs_e >= 0.5:
                return 5
            return 3

        recommended_weight = weight_from_effect(effect_val, conf)

        factor_results[fid] = {
            'factor_id': fid,
            'sample_dates': len(dates),
            'confidence': conf,
            'recommended_weight': recommended_weight,
            'by_hold': per_hold_summary
        }
        print(f'[INFO] {fid}: dates={len(dates)}, effect_d5={effect_val}, conf={conf}, weight={recommended_weight}')

    # 종목별 반응도 (대형주 × 팩터)
    print('[INFO] Computing per-stock response...')
    per_stock = {}
    for code in large_cap_codes:
        if code not in ohlcv_map:
            continue
        stock_entry = {}
        for fid, dates in all_factor_dates.items():
            if not dates:
                continue
            rets = []
            for d in dates:
                r = compute_returns_from_date(ohlcv_map, code, d, [5])
                if r[5] is not None:
                    rets.append(r[5])
            if not rets:
                continue
            avg = mean_or_none(rets)
            std = stddev(rets)
            conf = confidence_level(len(rets), avg, std)
            stock_entry[fid] = {
                'avg_return_d5': round(avg, 3) if avg is not None else None,
                'sample_days': len(rets),
                'confidence': conf
            }
        if stock_entry:
            per_stock[code] = stock_entry

    # 저장
    now = datetime.now(KST).isoformat()
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    factor_out = DATA_DIR / 'factor_backtest_results.json'
    factor_out.write_text(json.dumps({
        'updated_at': now,
        'factors': factor_results
    }, ensure_ascii=False), encoding='utf-8')
    print(f'[INFO] factor_backtest_results.json saved ({len(factor_results)} factors)')

    stock_out = DATA_DIR / 'stock_macro_response.json'
    stock_out.write_text(json.dumps({
        'updated_at': now,
        'stocks': per_stock
    }, ensure_ascii=False), encoding='utf-8')
    print(f'[INFO] stock_macro_response.json saved ({len(per_stock)} stocks)')


if __name__ == '__main__':
    run_backtest()
