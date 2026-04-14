import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fetch_fundamentals import (
    normalize_fundamental_row,
    build_net_purchase_history
)


def test_normalize_fundamental_row_valid():
    row = {'BPS': 50000, 'PER': 12.5, 'PBR': 1.24, 'EPS': 5000, 'DIV': 2.0, 'DPS': 1000}
    result = normalize_fundamental_row(row, market_cap=450_000_000_000_000)
    assert result['pbr'] == 1.24
    assert result['per'] == 12.5
    assert result['market_cap'] == 450_000_000_000_000


def test_normalize_fundamental_row_missing_pbr_is_none():
    row = {'BPS': 0, 'PER': 12.5, 'PBR': 0, 'EPS': 5000}
    result = normalize_fundamental_row(row, market_cap=100)
    assert result['pbr'] is None


def test_build_net_purchase_history_takes_last_n():
    rows = [
        {'date': '2026-04-01', 'foreign': 100, 'institution': 50},
        {'date': '2026-04-02', 'foreign': 200, 'institution': 80},
        {'date': '2026-04-03', 'foreign': -30, 'institution': 10},
    ]
    foreign, inst = build_net_purchase_history(rows, n=2)
    assert foreign == [200, -30]
    assert inst == [80, 10]


def test_build_net_purchase_history_empty():
    foreign, inst = build_net_purchase_history([], n=5)
    assert foreign == []
    assert inst == []
