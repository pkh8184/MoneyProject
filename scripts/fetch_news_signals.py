"""24시간 내 뉴스에서 팩터 키워드 감지.
입력: 네이버·연합 경제 RSS
출력: public/data/news_signals.json
"""
import json
import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone
import pytz

DATA_DIR = Path(__file__).resolve().parent.parent / 'public' / 'data'
KST = pytz.timezone('Asia/Seoul')

try:
    import feedparser
except ImportError:
    print('[ERROR] feedparser not installed. pip install feedparser', file=sys.stderr)
    sys.exit(1)

NEWS_FEEDS = [
    'https://rss.etnews.com/Section903.xml',   # 전자신문 경제
    'https://www.yna.co.kr/rss/economy.xml',   # 연합뉴스 경제
]

FACTOR_KEYWORDS = {
    'war_ongoing': ['전쟁', '우크라이나', '러시아 침공', '이스라엘', '하마스'],
    'nk_provocation': ['북한 미사일', '북한 도발', '김정은'],
    'middle_east': ['중동', '이란', '호르무즈'],
    'us_china': ['미중 갈등', '미국 관세', '반도체 제재'],
    'oil_up': ['유가 급등', '원유 상승', 'WTI 상승'],
    'oil_down': ['유가 급락', '원유 하락'],
    'rate_hike': ['금리 인상', '연준 인상', 'FOMC 매파'],
    'rate_cut': ['금리 인하', '연준 인하', '기준금리 인하'],
    'inflation': ['인플레이션', '물가 급등', 'CPI'],
    'ai_boom': ['AI 붐', 'ChatGPT', '엔비디아'],
    'ev_boom': ['전기차 판매', '전기차 수요', '테슬라'],
    'bio_boom': ['바이오 호조', '신약 임상'],
    'defense_boom': ['방산 수주', 'K-방산', '한화에어로스페이스 수주'],
    'kcontent_boom': ['K-팝', 'K-컨텐츠', '하이브'],
    'realestate_tight': ['부동산 규제', 'LTV', 'DSR'],
    'realestate_boost': ['부동산 부양', '주택 공급'],
    'domestic_down': ['내수 침체', '소비 위축'],
    'domestic_up': ['내수 회복', '소비 증가'],
    'export_boom': ['수출 호조', '수출 사상 최대'],
    'kospi_crash': ['코스피 급락', '증시 폭락'],
    'foreign_sell': ['외국인 매도', '외인 매도세'],
    'foreign_buy': ['외국인 매수', '외인 매수세']
}


def within_24h(entry) -> bool:
    try:
        t = entry.published_parsed
        if not t:
            return True  # 모르면 포함
        pub = datetime(*t[:6], tzinfo=timezone.utc)
        return datetime.now(timezone.utc) - pub < timedelta(hours=24)
    except Exception:
        return True


def main():
    collected = []
    for url in NEWS_FEEDS:
        try:
            feed = feedparser.parse(url)
        except Exception as e:
            print(f'[WARN] parse failed {url}: {e}', file=sys.stderr)
            continue
        for entry in feed.entries:
            if not within_24h(entry):
                continue
            title = entry.get('title', '') or ''
            collected.append(title)

    # 팩터별 매칭
    signals = {}
    for fid, keywords in FACTOR_KEYWORDS.items():
        matches = []
        for title in collected:
            for kw in keywords:
                if kw in title:
                    matches.append(title)
                    break
            if len(matches) >= 10:
                break
        if matches:
            signals[fid] = {
                'count': len(matches),
                'sample_titles': matches[:5]
            }

    out = {
        'updated_at': datetime.now(KST).isoformat(),
        'period_hours': 24,
        'total_articles': len(collected),
        'signals': signals
    }
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / 'news_signals.json').write_text(
        json.dumps(out, ensure_ascii=False), encoding='utf-8'
    )
    print(f'[INFO] news_signals.json: {len(collected)} articles, {len(signals)} factor matches')


if __name__ == '__main__':
    main()
