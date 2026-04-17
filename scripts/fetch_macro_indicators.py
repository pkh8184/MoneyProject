"""매크로 지표 수집 (환율·유가·코스피).
출력: public/data/macro_indicators.json
"""
import json
import sys
from pathlib import Path
from datetime import datetime, timedelta
import pytz
import FinanceDataReader as fdr

DATA_DIR = Path(__file__).resolve().parent.parent / 'public' / 'data'
KST = pytz.timezone('Asia/Seoul')


def fetch_fdr_indicator(symbol: str, days: int = 120) -> dict | None:
    """FDR로 심볼 시계열 수집 후 요약 지표 계산."""
    start = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
    try:
        df = fdr.DataReader(symbol, start)
    except Exception as e:
        print(f'[WARN] FDR {symbol} failed: {e}', file=sys.stderr)
        return None
    if df is None or df.empty or 'Close' not in df.columns:
        return None
    closes = df['Close'].dropna()
    if len(closes) < 20:
        return None
    current = float(closes.iloc[-1])
    def pct_change(ref_idx: int) -> float | None:
        if len(closes) <= ref_idx:
            return None
        ref = float(closes.iloc[-1 - ref_idx])
        if ref == 0:
            return None
        return round(((current - ref) / ref) * 100, 2)
    ma20 = float(closes.iloc[-20:].mean())
    vs_ma20 = round(((current - ma20) / ma20) * 100, 2) if ma20 > 0 else None
    return {
        'current': round(current, 2),
        'change_20d_pct': pct_change(20),
        'change_5d_pct': pct_change(5),
        'vs_ma20_pct': vs_ma20
    }


def fetch_kospi() -> dict | None:
    """KOSPI는 pykrx 우선 시도, 실패 시 FDR 폴백."""
    try:
        from pykrx import stock
        end = datetime.now().strftime('%Y%m%d')
        start = (datetime.now() - timedelta(days=120)).strftime('%Y%m%d')
        df = stock.get_index_ohlcv_by_date(start, end, '1001')
        if df is None or df.empty:
            raise RuntimeError('empty')
        closes = df['종가'].astype(float).dropna()
        if len(closes) < 20:
            raise RuntimeError('not enough')
        current = float(closes.iloc[-1])
        def pct_change(ref_idx: int) -> float | None:
            if len(closes) <= ref_idx:
                return None
            ref = float(closes.iloc[-1 - ref_idx])
            return round(((current - ref) / ref) * 100, 2) if ref > 0 else None
        ma20 = float(closes.iloc[-20:].mean())
        return {
            'current': round(current, 2),
            'change_20d_pct': pct_change(20),
            'change_5d_pct': pct_change(5),
            'vs_ma20_pct': round(((current - ma20) / ma20) * 100, 2) if ma20 > 0 else None
        }
    except Exception as e:
        print(f'[WARN] pykrx KOSPI failed: {e}, falling back to FDR', file=sys.stderr)
        return fetch_fdr_indicator('KS11')


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    result = {
        'updated_at': datetime.now(KST).isoformat(),
        'forex_usd_krw': fetch_fdr_indicator('USD/KRW'),
        'oil_wti': fetch_fdr_indicator('CL=F'),
        'kospi': fetch_kospi()
    }
    out_path = DATA_DIR / 'macro_indicators.json'
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'[INFO] macro_indicators.json saved: {result}')


if __name__ == '__main__':
    main()
