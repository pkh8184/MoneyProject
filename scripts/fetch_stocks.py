"""
종목 메타 + 일봉 수집 스크립트.
출력: public/data/stocks.json, public/data/ohlcv.json
"""
import json
import re
import sys
import time
from pathlib import Path
from datetime import datetime, timedelta
import pytz
from pykrx import stock

DATA_DIR = Path(__file__).resolve().parent.parent / 'public' / 'data'
PREFERRED_SUFFIX_RE = re.compile(r'우\d*[A-Z]?$')
SPAC_RE = re.compile(r'스팩|SPAC', re.IGNORECASE)


def filter_valid_tickers(candidates: list[tuple[str, str]]) -> list[tuple[str, str]]:
    """
    우선주·SPAC 제외.
    candidates: [(code, name), ...]
    """
    result = []
    for code, name in candidates:
        if PREFERRED_SUFFIX_RE.search(name):
            continue
        if SPAC_RE.search(name):
            continue
        result.append((code, name))
    return result


def get_all_candidates(date_str: str) -> list[tuple[str, str]]:
    """KOSPI + KOSDAQ 전 종목 조회."""
    ymd = date_str.replace('-', '')
    codes_kospi = stock.get_market_ticker_list(ymd, market='KOSPI')
    codes_kosdaq = stock.get_market_ticker_list(ymd, market='KOSDAQ')
    all_codes = codes_kospi + codes_kosdaq
    candidates = [(c, stock.get_market_ticker_name(c)) for c in all_codes]
    return candidates


def fetch_ohlcv(code: str, start_ymd: str, end_ymd: str, retries: int = 3) -> dict | None:
    """단일 종목 조정종가 OHLCV 조회. 실패 시 None."""
    for attempt in range(retries):
        try:
            df = stock.get_market_ohlcv_by_date(
                start_ymd, end_ymd, code, adjusted=True
            )
            if df.empty:
                return None
            df.index = df.index.strftime('%Y-%m-%d')
            return {
                'dates':  df.index.tolist(),
                'open':   df['시가'].astype(int).tolist(),
                'high':   df['고가'].astype(int).tolist(),
                'low':    df['저가'].astype(int).tolist(),
                'close':  df['종가'].astype(int).tolist(),
                'volume': df['거래량'].astype(int).tolist()
            }
        except Exception as e:
            if attempt == retries - 1:
                print(f'[WARN] {code} fetch failed after {retries} retries: {e}',
                      file=sys.stderr)
                return None
            time.sleep(1.0)
    return None


def main():
    kst = pytz.timezone('Asia/Seoul')
    today = datetime.now(kst).strftime('%Y-%m-%d')
    ymd = today.replace('-', '')

    start_dt = datetime.strptime(today, '%Y-%m-%d') - timedelta(days=365)
    start_ymd = start_dt.strftime('%Y%m%d')

    print(f'[INFO] Fetching tickers for {today}...')
    candidates = get_all_candidates(today)
    print(f'[INFO] Total candidates: {len(candidates)}')

    valid = filter_valid_tickers(candidates)
    print(f'[INFO] After filter: {len(valid)}')

    market_map = {}
    for code in stock.get_market_ticker_list(ymd, market='KOSPI'):
        market_map[code] = 'KOSPI'
    for code in stock.get_market_ticker_list(ymd, market='KOSDAQ'):
        market_map[code] = 'KOSDAQ'

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    stocks_json = {
        'updated_at': datetime.now(kst).isoformat(),
        'trade_date': today,
        'count': len(valid),
        'stocks': [
            {'code': c, 'name': n, 'market': market_map.get(c, 'UNKNOWN')}
            for c, n in valid
        ]
    }
    (DATA_DIR / 'stocks.json').write_text(
        json.dumps(stocks_json, ensure_ascii=False),
        encoding='utf-8'
    )
    print(f'[INFO] stocks.json saved ({len(valid)} stocks)')

    print(f'[INFO] Fetching OHLCV from {start_ymd} to {ymd}...')
    ohlcv = {}
    fail_count = 0
    for i, (code, _name) in enumerate(valid):
        data = fetch_ohlcv(code, start_ymd, ymd)
        if data is None:
            fail_count += 1
            continue
        ohlcv[code] = data
        if (i + 1) % 100 == 0:
            print(f'[INFO] {i+1}/{len(valid)} fetched (fails: {fail_count})')

    (DATA_DIR / 'ohlcv.json').write_text(
        json.dumps(ohlcv, ensure_ascii=False),
        encoding='utf-8'
    )
    print(f'[INFO] ohlcv.json saved ({len(ohlcv)} stocks, {fail_count} failed)')


if __name__ == '__main__':
    main()
