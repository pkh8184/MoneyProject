"""
GitHub Actions 워크플로 내에서 휴장일 감지 후 exit.
거래일이면 exit 0 (계속), 휴장일이면 exit 78 (중립 종료).
"""
import sys
from datetime import datetime
import pytz
from check_trading_day import is_trading_day

kst = pytz.timezone('Asia/Seoul')
today = datetime.now(kst).strftime('%Y-%m-%d')

if is_trading_day(today):
    print(f'{today}: trading day — proceed')
    sys.exit(0)
else:
    print(f'{today}: holiday — skip workflow')
    sys.exit(78)
