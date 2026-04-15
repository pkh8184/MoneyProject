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
    """KOSPI + KOSDAQ 전 종목 조회. pykrx 실패 시 FinanceDataReader로 폴백."""
    ymd = date_str.replace('-', '')
    try:
        codes_kospi = stock.get_market_ticker_list(ymd, market='KOSPI')
        codes_kosdaq = stock.get_market_ticker_list(ymd, market='KOSDAQ')
    except Exception as e:
        print(f'[WARN] pykrx ticker list failed: {e}', file=sys.stderr)
        codes_kospi = []
        codes_kosdaq = []

    all_codes = codes_kospi + codes_kosdaq
    if len(all_codes) > 100:
        # pykrx 정상 동작
        candidates = []
        for c in all_codes:
            try:
                name = stock.get_market_ticker_name(c)
                candidates.append((c, name))
            except Exception:
                continue
        return candidates

    # pykrx가 빈 결과 반환 → FinanceDataReader 폴백
    print('[WARN] pykrx returned empty/insufficient, falling back to FinanceDataReader', file=sys.stderr)
    try:
        import FinanceDataReader as fdr
        df_kospi = fdr.StockListing('KOSPI')
        df_kosdaq = fdr.StockListing('KOSDAQ')
        candidates = []
        for df in (df_kospi, df_kosdaq):
            if df is None or df.empty:
                continue
            code_col = 'Code' if 'Code' in df.columns else df.columns[0]
            name_col = 'Name' if 'Name' in df.columns else df.columns[1]
            for _, row in df.iterrows():
                code = str(row[code_col]).zfill(6)
                name = str(row[name_col]) if row[name_col] else ''
                if code and name:
                    candidates.append((code, name))
        print(f'[INFO] FinanceDataReader provided {len(candidates)} candidates', file=sys.stderr)
        return candidates
    except Exception as e:
        print(f'[ERROR] FinanceDataReader fallback also failed: {e}', file=sys.stderr)
        return []


def get_market_maps(ymd: str) -> dict[str, str]:
    """KOSPI/KOSDAQ 구분 매핑. pykrx 실패 시 FDR 폴백."""
    market_map: dict[str, str] = {}
    try:
        for code in stock.get_market_ticker_list(ymd, market='KOSPI'):
            market_map[code] = 'KOSPI'
        for code in stock.get_market_ticker_list(ymd, market='KOSDAQ'):
            market_map[code] = 'KOSDAQ'
    except Exception:
        pass

    if len(market_map) < 100:
        try:
            import FinanceDataReader as fdr
            for code in fdr.StockListing('KOSPI')['Code']:
                market_map[str(code).zfill(6)] = 'KOSPI'
            for code in fdr.StockListing('KOSDAQ')['Code']:
                market_map[str(code).zfill(6)] = 'KOSDAQ'
        except Exception as e:
            print(f'[WARN] FDR market map fallback failed: {e}', file=sys.stderr)
    return market_map


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

    start_dt = datetime.strptime(today, '%Y-%m-%d') - timedelta(days=1100)
    start_ymd = start_dt.strftime('%Y%m%d')

    print(f'[INFO] Fetching tickers for {today}...')
    candidates = get_all_candidates(today)
    print(f'[INFO] Total candidates: {len(candidates)}')

    valid = filter_valid_tickers(candidates)
    print(f'[INFO] After filter: {len(valid)}')

    market_map = get_market_maps(ymd)

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
