import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fetch_stocks import filter_valid_tickers


def test_excludes_preferred_stock_names():
    candidates = [
        ('005930', '삼성전자'),
        ('005935', '삼성전자우'),
        ('051910', 'LG화학'),
        ('051915', 'LG화학우B'),
    ]
    result = filter_valid_tickers(candidates)
    codes = [c for c, _ in result]
    assert '005930' in codes
    assert '005935' not in codes
    assert '051910' in codes
    assert '051915' not in codes


def test_excludes_spac():
    candidates = [
        ('005930', '삼성전자'),
        ('123456', '에이치엘비제15호스팩'),
        ('789012', 'NH스팩20호'),
    ]
    result = filter_valid_tickers(candidates)
    codes = [c for c, _ in result]
    assert '005930' in codes
    assert '123456' not in codes
    assert '789012' not in codes


def test_keeps_normal_stocks():
    candidates = [
        ('005930', '삼성전자'),
        ('000660', 'SK하이닉스'),
        ('035420', 'NAVER'),
    ]
    result = filter_valid_tickers(candidates)
    assert len(result) == 3


def test_empty_input_returns_empty():
    assert filter_valid_tickers([]) == []
