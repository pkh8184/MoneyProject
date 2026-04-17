"""factor_backtest_results.json을 읽어 factors.ts 업데이트 권장안을 출력.
개발자가 이 표를 보고 수동으로 factors.ts weight 필드를 업데이트한다.
"""
import json
import sys
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / 'public' / 'data'


def main():
    src = DATA_DIR / 'factor_backtest_results.json'
    if not src.exists():
        print(f'[ERROR] {src} not found. Run backtest_factors.py first.', file=sys.stderr)
        sys.exit(1)

    data = json.loads(src.read_text(encoding='utf-8'))
    factors = data.get('factors', {})

    print('=== Factor Weight Update Recommendations ===')
    print(f'Generated at: {data.get("updated_at")}')
    print()
    print(f'{"factor_id":<20} {"current":<8} {"recommended":<12} {"effect_d5":<10} {"conf":<8} {"sample":<10}')
    print('-' * 80)

    # 현재 weight 값 (factors.ts 참조용 하드코딩)
    CURRENT = {
        'war_ongoing': 10, 'kospi_crash': 10, 'foreign_sell': 10,
        'rate_hike': 8, 'rate_cut': 8, 'inflation': 8, 'ai_boom': 8, 'us_china': 8, 'oil_up': 8,
        'krw_weak': 7, 'krw_strong': 7, 'oil_down': 7, 'ev_boom': 7, 'export_boom': 7, 'foreign_buy': 7,
        'middle_east': 5, 'trade_boom': 5, 'bio_boom': 5, 'defense_boom': 5,
        'realestate_tight': 5, 'realestate_boost': 5, 'domestic_down': 5, 'domestic_up': 5, 'kcontent_boom': 5,
        'nk_provocation': 3, 'gold_up': 3, 'taiwan_tension': 3, 'korea_peace': 3,
        'lithium_copper': 3, 'grain_up': 3
    }

    for fid, fd in sorted(factors.items()):
        cur = CURRENT.get(fid, '-')
        rec = fd.get('recommended_weight', '-')
        d5 = fd.get('by_hold', {}).get('d5', {})
        eff = d5.get('effect_benefit', '-')
        conf = fd.get('confidence', '-')
        sample = d5.get('sample_benefit', '-')
        diff = ''
        if isinstance(cur, int) and isinstance(rec, int):
            diff = f' ({rec - cur:+d})' if rec != cur else ''
        print(f'{fid:<20} {str(cur):<8} {str(rec)+diff:<12} {str(eff):<10} {conf:<8} {str(sample):<10}')

    print()
    print('검토 후 src/lib/macro/factors.ts의 weight 필드를 수동으로 업데이트하세요.')
    print('confidence=low 인 팩터는 기본값(3) 유지 권장.')
    print('극단적 변경 (예: 10 → 3)은 샘플 확인 후 신중히 판단.')


if __name__ == '__main__':
    main()
