"""섹터별 최근 30일 평균 수익률 계산.
입력: sectors.json + ohlcv/{code}.json
출력: public/data/sector_rotation.json
"""
import json
import sys
from pathlib import Path
from datetime import datetime
import pytz

DATA_DIR = Path(__file__).resolve().parent.parent / 'public' / 'data'
KST = pytz.timezone('Asia/Seoul')
PERIOD_DAYS = 30


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


def compute_return_30d(oh: dict) -> float | None:
    closes = oh.get('close') or []
    if len(closes) < PERIOD_DAYS + 1:
        return None
    cur = closes[-1]
    ref = closes[-PERIOD_DAYS - 1]
    if not cur or not ref or ref <= 0:
        return None
    return ((cur - ref) / ref) * 100


def main():
    sectors = load_json('sectors.json')
    stocks = load_json('stocks.json')
    if not sectors or not stocks:
        print('[ERROR] sectors.json or stocks.json missing', file=sys.stderr)
        sys.exit(1)

    # theme → [returns]
    theme_returns: dict[str, list[float]] = {}
    for s in stocks.get('stocks', []):
        code = s['code']
        themes = (sectors.get(code) or {}).get('themes') or []
        if not themes:
            continue
        oh = load_ohlcv(code)
        if not oh:
            continue
        r = compute_return_30d(oh)
        if r is None:
            continue
        for t in themes:
            theme_returns.setdefault(t, []).append(r)

    # 평균 계산
    rows = []
    for theme, rets in theme_returns.items():
        if len(rets) < 3:  # 최소 3종목
            continue
        avg = sum(rets) / len(rets)
        rows.append({
            'theme': theme,
            'avg_return_pct': round(avg, 2),
            'sample_stocks': len(rets)
        })

    # 정렬 후 rank 부여
    rows.sort(key=lambda x: -x['avg_return_pct'])
    for i, r in enumerate(rows):
        if r['avg_return_pct'] >= 5.0 or i < 3:
            r['rank'] = 'strong'
        elif r['avg_return_pct'] <= -5.0 or i >= len(rows) - 3:
            r['rank'] = 'weak'
        else:
            r['rank'] = 'neutral'

    out = {
        'updated_at': datetime.now(KST).isoformat(),
        'period_days': PERIOD_DAYS,
        'sectors': rows
    }
    (DATA_DIR / 'sector_rotation.json').write_text(
        json.dumps(out, ensure_ascii=False), encoding='utf-8'
    )
    strong = [r['theme'] for r in rows if r['rank'] == 'strong']
    weak = [r['theme'] for r in rows if r['rank'] == 'weak']
    print(f'[INFO] sector_rotation.json saved: strong={strong}, weak={weak}')


if __name__ == '__main__':
    main()
