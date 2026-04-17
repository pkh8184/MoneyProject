"""종목별 섹터 및 테마 태그 수집. FDR StockListing + 키워드 분류."""
import json
import sys
from pathlib import Path
import FinanceDataReader as fdr

DATA_DIR = Path(__file__).resolve().parent.parent / 'public' / 'data'

THEME_KEYWORDS = {
    '반도체': ['반도체', '메모리', '파운드리', '하이닉스', '삼성전자', 'DB하이텍', '디스플레이'],
    '2차전지': ['배터리', '2차전지', '양극재', '음극재', '에코프로', 'LG에너지', 'SK이노베이션', '포스코퓨처엠', 'LG화학', 'SK온'],
    'AI': ['AI', '인공지능', '클라우드', 'NAVER', '카카오', '소프트웨어', '플랫폼'],
    '전기차': ['전기차', '자동차', 'EV', '현대차', '기아', '모비스'],
    '보안': ['보안', '안랩', '시큐', '사이버'],
    '바이오': ['바이오', '제약', '셀트리온', '삼성바이오', '유한양행'],
    '게임': ['게임', '엔씨', '넥슨', '크래프톤', '네오위즈', '펄어비스'],
    '금융': ['금융', '은행', '증권', '카드', '보험'],
    # === Phase 13 신규 (매크로 팩터용) ===
    '방산': ['방산', '한화에어로스페이스', 'LIG넥스원', '한국항공우주', '현대로템', '풍산', '빅텍', '스페코'],
    '건설': ['건설', '삼성물산', '현대건설', '대우건설', 'GS건설', 'DL이앤씨', 'HDC현대산업'],
    '정유·에너지': ['S-Oil', 'SK이노베이션', 'GS', '한국가스공사', '한국전력', 'E1', '정유', '석유'],
    '항공·여행': ['대한항공', '아시아나', '제주항공', '티웨이', '진에어', '하나투어', '노랑풍선', '모두투어', '호텔신라'],
    '해운·물류': ['HMM', '팬오션', 'CJ대한통운', '한진', '세방', '현대글로비스'],
    '유통': ['이마트', '롯데쇼핑', 'BGF리테일', 'GS리테일', '현대백화점', '신세계', '편의점'],
    '시멘트·건자재': ['삼표시멘트', '한일시멘트', '아시아시멘트', 'KCC', '쌍용양회', '동양'],
    '식품·음료': ['농심', '롯데칠성', 'CJ제일제당', '오뚜기', '대한제분', '동원F&B', '삼양', '오리온', '하림', '마니커'],
    '통신': ['SK텔레콤', 'KT', 'LG유플러스', 'LG헬로비전'],
    '전력·가스': ['한국전력', '한국가스공사', '삼천리', '경동도시가스', '지역난방공사'],
    '엔터·미디어': ['CJ ENM', '하이브', '스튜디오드래곤', 'JYP', 'SM', 'YG', '에스엠', '빅히트', '와이지'],
    '화장품': ['LG생활건강', '아모레퍼시픽', '코스맥스', '클리오', '한국콜마', '토니모리'],
    '담배': ['KT&G'],
    '철강·비철금속': ['POSCO', '현대제철', '고려아연', '풍산', '세아', '동국제강']
}


def classify_themes(text: str) -> list[str]:
    tags = []
    text_lower = text.lower()
    for theme, keywords in THEME_KEYWORDS.items():
        if any(kw.lower() in text_lower for kw in keywords):
            tags.append(theme)
    return tags


def main():
    result = {}
    for market in ('KOSPI', 'KOSDAQ'):
        try:
            df = fdr.StockListing(market)
        except Exception as e:
            print(f'[WARN] Failed to fetch {market}: {e}', file=sys.stderr)
            continue
        if df is None or df.empty:
            continue
        for _, row in df.iterrows():
            code = str(row.get('Code', '')).zfill(6)
            if not code:
                continue
            name = str(row.get('Name', '') or '')
            sector = str(row.get('Sector', '') or '') if 'Sector' in df.columns else ''
            industry = str(row.get('Industry', '') or '') if 'Industry' in df.columns else ''
            themes = classify_themes(f'{name} {sector} {industry}')
            result[code] = {
                'sector': sector,
                'industry': industry,
                'themes': themes
            }
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / 'sectors.json').write_text(
        json.dumps(result, ensure_ascii=False),
        encoding='utf-8'
    )
    print(f'[INFO] sectors.json saved ({len(result)} stocks)')


if __name__ == '__main__':
    main()
