"""
휴장일 감지 스크립트.
사용: python check_trading_day.py [--date YYYY-MM-DD]
반환: 거래일이면 exit 0, 휴장일이면 exit 1
"""
import argparse
import sys
from datetime import datetime
import pytz
from pykrx import stock


def is_trading_day(date_str: str) -> bool:
    """해당 날짜가 KRX 거래일인지 확인."""
    dt = datetime.strptime(date_str, '%Y-%m-%d')
    # 주말 제외
    if dt.weekday() >= 5:
        return False
    # pykrx로 해당 날짜의 거래 이력 확인 (빈 결과면 휴장일)
    ymd = dt.strftime('%Y%m%d')
    df = stock.get_market_ohlcv_by_date(ymd, ymd, '005930')  # 삼성전자로 테스트
    return not df.empty


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--date', type=str, default=None,
                        help='YYYY-MM-DD (기본: 오늘 KST)')
    args = parser.parse_args()

    if args.date is None:
        kst = pytz.timezone('Asia/Seoul')
        args.date = datetime.now(kst).strftime('%Y-%m-%d')

    if is_trading_day(args.date):
        print(f'{args.date}: trading day')
        sys.exit(0)
    else:
        print(f'{args.date}: holiday')
        sys.exit(1)


if __name__ == '__main__':
    main()
