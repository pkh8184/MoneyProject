"""
GitHub Actions 워크플로 내에서 거래일 확인 후 exit.
스마트 날짜 로직: KST 16시 이전이면 전일, 이후면 당일, 주말·공휴일 자동 후퇴.

exit 0 = 거래일 확인됨 (계속 진행)
exit 78 = 거래일 찾지 못함 (워크플로 스킵)
"""
import sys
from trade_date import get_latest_trade_date

trade_date = get_latest_trade_date()
print(f'[INFO] Latest trade date: {trade_date} — proceed')

# GITHUB_OUTPUT에 trade_date를 환경변수로 전달
import os
github_output = os.environ.get('GITHUB_OUTPUT')
if github_output:
    with open(github_output, 'a') as f:
        f.write(f'trade_date={trade_date}\n')

sys.exit(0)
