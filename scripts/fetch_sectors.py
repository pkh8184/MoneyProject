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
    '금융': ['금융', '은행', '증권', '카드', '보험']
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
