"""
펀더멘털 + 수급 수집.
출력: public/data/fundamentals.json, public/data/updated_at.json
"""
import json
import sys
from pathlib import Path
from datetime import datetime, timedelta
import pytz
from pykrx import stock

DATA_DIR = Path(__file__).resolve().parent.parent / 'public' / 'data'


def normalize_fundamental_row(row: dict, market_cap: int) -> dict:
    """단일 종목의 PBR/PER/시총 정규화. 0은 None."""
    pbr = row.get('PBR', 0)
    per = row.get('PER', 0)
    return {
        'pbr': float(pbr) if pbr and pbr > 0 else None,
        'per': float(per) if per and per > 0 else None,
        'market_cap': int(market_cap) if market_cap else 0
    }


def build_net_purchase_history(rows: list[dict], n: int = 10) -> tuple[list[int], list[int]]:
    """[{date, foreign, institution}] → (foreign[], inst[]) 최근 n일."""
    if not rows:
        return [], []
    tail = rows[-n:]
    return (
        [int(r['foreign']) for r in tail],
        [int(r['institution']) for r in tail]
    )


def main():
    kst = pytz.timezone('Asia/Seoul')
    today = datetime.now(kst).strftime('%Y-%m-%d')
    ymd = today.replace('-', '')

    stocks_path = DATA_DIR / 'stocks.json'
    if not stocks_path.exists():
        print('[ERROR] stocks.json missing.', file=sys.stderr)
        sys.exit(1)
    stocks = json.loads(stocks_path.read_text(encoding='utf-8'))

    print('[INFO] Fetching fundamentals...')
    df_fund = stock.get_market_fundamental(ymd)
    df_cap = stock.get_market_cap(ymd)

    print('[INFO] Fetching net purchases (last 10 trading days)...')
    start_dt = datetime.strptime(today, '%Y-%m-%d') - timedelta(days=20)
    start_ymd = start_dt.strftime('%Y%m%d')

    result = {}
    for s in stocks['stocks']:
        code = s['code']
        fund_row = df_fund.loc[code].to_dict() if code in df_fund.index else {}
        cap = int(df_cap.loc[code, '시가총액']) if code in df_cap.index else 0
        fund = normalize_fundamental_row(fund_row, cap)

        try:
            net_df = stock.get_market_net_purchases_of_equities(
                start_ymd, ymd, code, '개별'
            )
            rows = []
            if not net_df.empty:
                for idx, row in net_df.iterrows():
                    rows.append({
                        'date': idx.strftime('%Y-%m-%d'),
                        'foreign': int(row.get('외국인', 0)),
                        'institution': int(row.get('기관합계', 0))
                    })
            foreign, inst = build_net_purchase_history(rows, n=10)
        except Exception:
            foreign, inst = [], []

        result[code] = {
            **fund,
            'foreign_net': foreign,
            'institution_net': inst
        }

    (DATA_DIR / 'fundamentals.json').write_text(
        json.dumps(result, ensure_ascii=False),
        encoding='utf-8'
    )
    print(f'[INFO] fundamentals.json saved ({len(result)} stocks)')

    updated = {
        'updated_at': datetime.now(kst).isoformat(),
        'trade_date': stocks['trade_date']
    }
    (DATA_DIR / 'updated_at.json').write_text(
        json.dumps(updated, ensure_ascii=False),
        encoding='utf-8'
    )
    print(f'[INFO] updated_at.json saved')


if __name__ == '__main__':
    main()
