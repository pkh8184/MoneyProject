"""5년 매크로 지표 수집 (USD/KRW, WTI, KOSPI).
출력: public/data/historical_macro.json
"""
import json
import sys
from pathlib import Path
from datetime import datetime, timedelta
import pytz
import FinanceDataReader as fdr

DATA_DIR = Path(__file__).resolve().parent.parent / 'public' / 'data'
KST = pytz.timezone('Asia/Seoul')


def fetch_series(symbol: str, years: int = 5) -> list | None:
    """FDR로 시계열 수집 후 [{date, close}, ...] 반환."""
    start = (datetime.now() - timedelta(days=years * 365 + 30)).strftime('%Y-%m-%d')
    try:
        df = fdr.DataReader(symbol, start)
    except Exception as e:
        print(f'[WARN] FDR {symbol} failed: {e}', file=sys.stderr)
        return None
    if df is None or df.empty or 'Close' not in df.columns:
        return None
    df = df.dropna(subset=['Close'])
    records = []
    for idx, row in df.iterrows():
        date_str = idx.strftime('%Y-%m-%d') if hasattr(idx, 'strftime') else str(idx)[:10]
        records.append({
            'date': date_str,
            'close': round(float(row['Close']), 2)
        })
    return records


def fetch_kospi_series(years: int = 5) -> list | None:
    """pykrx 우선, 실패 시 FDR 폴백."""
    try:
        from pykrx import stock
        end = datetime.now().strftime('%Y%m%d')
        start = (datetime.now() - timedelta(days=years * 365 + 30)).strftime('%Y%m%d')
        df = stock.get_index_ohlcv_by_date(start, end, '1001')
        if df is None or df.empty:
            raise RuntimeError('empty')
        df = df.dropna(subset=['종가'])
        records = []
        for idx, row in df.iterrows():
            date_str = idx.strftime('%Y-%m-%d') if hasattr(idx, 'strftime') else str(idx)[:10]
            records.append({
                'date': date_str,
                'close': round(float(row['종가']), 2)
            })
        return records
    except Exception as e:
        print(f'[WARN] pykrx KOSPI failed: {e}, fallback to FDR', file=sys.stderr)
        return fetch_series('KS11', years)


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    result = {
        'updated_at': datetime.now(KST).isoformat(),
        'years': 5,
        'forex_usd_krw': fetch_series('USD/KRW'),
        'oil_wti': fetch_series('CL=F'),
        'kospi': fetch_kospi_series()
    }
    out_path = DATA_DIR / 'historical_macro.json'
    out_path.write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
    forex_n = len(result['forex_usd_krw']) if result['forex_usd_krw'] else 0
    oil_n = len(result['oil_wti']) if result['oil_wti'] else 0
    kospi_n = len(result['kospi']) if result['kospi'] else 0
    print(f'[INFO] historical_macro.json saved: forex={forex_n}, oil={oil_n}, kospi={kospi_n}')


if __name__ == '__main__':
    main()
