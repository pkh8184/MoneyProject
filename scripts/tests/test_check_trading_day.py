import subprocess
import sys
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / 'check_trading_day.py'


def _run(date_str: str) -> int:
    result = subprocess.run(
        [sys.executable, str(SCRIPT), '--date', date_str],
        capture_output=True, text=True
    )
    return result.returncode


def test_weekday_trading_day_returns_0():
    # 2024-03-15 (금) 정상 거래일
    assert _run('2024-03-15') == 0


def test_saturday_returns_1():
    # 2024-03-16 (토) 휴장
    assert _run('2024-03-16') == 1


def test_new_year_day_returns_1():
    # 2024-01-01 (월) 신정 휴장
    assert _run('2024-01-01') == 1


def test_childrens_day_returns_1():
    # 2024-05-06 (월) 어린이날 대체휴일
    assert _run('2024-05-06') == 1
