"""
스마트 거래일 날짜 결정 유틸.

KST 16:00 이전이면 전일 기준, 이후면 당일 기준.
주말·공휴일이면 직전 거래일로 자동 후퇴.
모든 데이터 수집 스크립트가 이 모듈의 get_latest_trade_date()를 사용.
"""
from datetime import datetime, timedelta
import pytz
from pykrx import stock


KST = pytz.timezone('Asia/Seoul')
MARKET_CLOSE_HOUR = 16  # 장 마감 15:30 + 여유 → 16시 기준


def get_latest_trade_date() -> str:
    """
    현재 KST 기준으로 가장 최근 데이터가 확실히 있을 날짜 반환.

    - KST 16:00 이후: 당일 (장 마감 후 데이터 확정)
    - KST 16:00 이전: 전일
    - 주말이면 직전 금요일로 후퇴
    - 공휴일이면 pykrx로 확인 후 추가 후퇴

    반환: 'YYYY-MM-DD' 형식
    """
    now = datetime.now(KST)
    dt = now.date()

    # 16시 이전이면 전일로
    if now.hour < MARKET_CLOSE_HOUR:
        dt -= timedelta(days=1)

    # 주말 후퇴 (토→금, 일→금)
    while dt.weekday() >= 5:
        dt -= timedelta(days=1)

    # pykrx로 실제 거래일 확인 (최대 10일 후퇴)
    for _ in range(10):
        ymd = dt.strftime('%Y%m%d')
        try:
            df = stock.get_market_ohlcv_by_date(ymd, ymd, '005930')
            if not df.empty:
                return dt.strftime('%Y-%m-%d')
        except Exception:
            pass
        dt -= timedelta(days=1)
        while dt.weekday() >= 5:
            dt -= timedelta(days=1)

    # 10일 내 거래일 못 찾으면 그냥 현재 날짜 반환 (fallback)
    return datetime.now(KST).strftime('%Y-%m-%d')


if __name__ == '__main__':
    date = get_latest_trade_date()
    print(f'Latest trade date: {date}')
