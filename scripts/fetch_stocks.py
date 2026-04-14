"""
종목 메타 + 일봉 수집 스크립트.
출력: public/data/stocks.json, public/data/ohlcv.json
"""
import json
import re
import sys
from pathlib import Path
from datetime import datetime
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


if __name__ == '__main__':
    # 메인 로직은 Task 10에서 구현
    pass
