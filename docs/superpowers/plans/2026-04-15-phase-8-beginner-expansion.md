# Phase 8 — 초보 모드 대폭 확장 (섹터·장기·급등·예측확률) Implementation Plan

**Goal:** 초보 모드를 "오늘의 추천" 단일 섹션에서 **5개 섹션의 큐레이팅 뷰**로 확장한다. 과거 유사 패턴 기반의 D+1/D+3/D+7 예상 수익률 및 상승 확률을 표시한다.

**Architecture:** 데이터 수집 기간 3년으로 확장 → 섹터 정보 포함 → 브라우저 단에서 종목별 과거 유사 이벤트 스캔하여 D+N 수익률 통계 계산 → 새 UI 섹션 렌더링.

**Branch:** `feature/phase-8-beginner-expansion`

**Prerequisite:** Phase 1-7 배포 완료 + data 브랜치 정상 작동

---

## 📋 5개 섹션 구조 (초보 모드)

```
[상단: 오늘의 추천]        ← 기존 유지 (combo_golden + combo_value_rebound)
[중장기 장기 투자]         ← 신규 (정배열 + PBR 저평가 + 60일선 상승)
[급등 예상]                ← 신규 (거래량 급증 + 수급 + 연속 양봉)
[테마별]                   ← 신규 (반도체/전기·2차전지/보안/AI 등 태그별)
[예측 수익률 Top 10]       ← 신규 (D+7 예상 수익률 정렬)
```

각 섹션은 카드 3~6개. 카드 클릭 시 기존 `/stock/[code]` 페이지로 이동.  
카드에는 **D+1/D+3/D+7 예상 수익률 + 상승 확률 %** 추가 표시.

---

## 📁 File Structure

### 데이터 파이프라인 확장
- `scripts/fetch_stocks.py` — 수집 기간 365일 → 1100일 (3년)로 확장
- `scripts/fetch_sectors.py` (신규) — 종목별 섹터/테마 수집 (FDR StockListing + 자체 태그 매핑)
- `scripts/calculate_pattern_stats.py` (신규) — 과거 패턴 스캐너 + D+N 수익률 집계
- `public/data/sectors.json` (신규) — `{ code: { sector, theme_tags[] } }`
- `public/data/pattern_stats.json` (신규) — 프리셋별·종목별 과거 수익률 통계

### 프런트 확장
- `src/lib/types/indicators.ts` — Sector, PatternStats 타입 추가
- `src/lib/dataLoader.ts` — loadSectors, loadPatternStats 추가
- `src/lib/stats/` (신규)
  - `historicalScan.ts` — 브라우저 내 과거 스캔 함수
  - `returnStats.ts` — D+N 수익률 계산 유틸
- `src/lib/themes/` (신규)
  - `keywords.ts` — 테마 키워드 매핑 (반도체/AI/2차전지/보안 등)
  - `matcher.ts` — 종목명 기반 테마 분류
- `src/components/screener/sections/` (신규)
  - `TodayRecommendSection.tsx` (기존 분리)
  - `LongTermSection.tsx`
  - `HighGrowthSection.tsx`
  - `ThemeSection.tsx`
  - `PredictedReturnSection.tsx`
- `src/components/screener/StockCardWithPrediction.tsx` — D+N 예상 수익률 카드
- `src/app/[basePath]/screener/BeginnerScreener.tsx` — 5개 섹션 조립으로 전면 개편

### 테스트
- `src/lib/stats/__tests__/historicalScan.test.ts`
- `src/lib/stats/__tests__/returnStats.test.ts`
- `src/lib/themes/__tests__/matcher.test.ts`

---

## Task 1: 데이터 수집 기간 3년으로 확장

**Files:** `scripts/fetch_stocks.py`

기존:
```python
start_dt = datetime.strptime(today, '%Y-%m-%d') - timedelta(days=365)
```

변경:
```python
# 약 3년 = 대략 750 거래일, 여유있게 1100일로 설정
start_dt = datetime.strptime(today, '%Y-%m-%d') - timedelta(days=1100)
```

### 영향
- `ohlcv.json` 용량: 약 40MB → **약 120MB**  
- Raw 기준. gzip 후 약 18MB → Vercel 대역폭 (무료 100GB/월) 내 안전
- 데이터 브랜치 비대화 방지: orphan commit 구조 유지 → 리포 용량 25MB 수준 (여전히 한도 내)
- GitHub Actions 수집 시간: 15분 → **약 25~30분**

### 리스크
- pykrx가 3년 전 데이터 요청 시 실패 확률 증가
- 상장 후 3년 미만 종목은 자연 null 처리 (기존 로직 그대로)

Commit: `feat(phase-8): extend OHLCV collection to 3 years (1100 days)`

---

## Task 2: 섹터·테마 데이터 수집

**File:** `scripts/fetch_sectors.py` (신규)

```python
"""종목별 섹터 및 테마 태그 수집. FDR StockListing 활용 + 키워드 분류."""
import json
import sys
from pathlib import Path
import FinanceDataReader as fdr

DATA_DIR = Path(__file__).resolve().parent.parent / 'public' / 'data'

THEME_KEYWORDS = {
    '반도체': ['반도체', '메모리', 'SK하이닉스', '삼성전자', 'DB하이텍'],
    '2차전지': ['배터리', '2차전지', 'LG에너지', '에코프로', 'SK이노베이션', '포스코퓨처엠'],
    'AI': ['AI', '인공지능', 'NAVER', '카카오'],
    '바이오': ['바이오', '셀트리온', '삼성바이오'],
    '전기차': ['전기차', '자동차', '현대차', '기아'],
    '보안': ['보안', '안랩', '시큐아이'],
    # 등 확장 가능
}

def classify_themes(name: str) -> list[str]:
    tags = []
    for theme, keywords in THEME_KEYWORDS.items():
        if any(kw.lower() in name.lower() for kw in keywords):
            tags.append(theme)
    return tags

def main():
    df_kospi = fdr.StockListing('KOSPI')
    df_kosdaq = fdr.StockListing('KOSDAQ')
    result = {}
    for df in (df_kospi, df_kosdaq):
        for _, row in df.iterrows():
            code = str(row.get('Code', '')).zfill(6)
            name = str(row.get('Name', ''))
            sector = str(row.get('Sector', '')) if 'Sector' in df.columns else ''
            industry = str(row.get('Industry', '')) if 'Industry' in df.columns else ''
            themes = classify_themes(name + ' ' + sector + ' ' + industry)
            result[code] = { 'sector': sector, 'industry': industry, 'themes': themes }
    (DATA_DIR / 'sectors.json').write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
    print(f'[INFO] sectors.json saved ({len(result)} stocks)')

if __name__ == '__main__':
    main()
```

워크플로(`daily-update.yml`)에 한 단계 추가:
```yaml
- name: Fetch sectors
  if: steps.trading.outputs.skip != 'true'
  run: |
    cd scripts
    python fetch_sectors.py
```

Commit: `feat(phase-8): add sector and theme tag collection`

---

## Task 3: 과거 패턴 통계 계산 (Python)

**File:** `scripts/calculate_pattern_stats.py` (신규)

### 핵심 로직

각 종목의 3년치 ohlcv에서:

1. **이벤트 정의**: "거래량 급증 (당일 > 전 20일 평균 × 1.5) + 당일 양봉"
2. **역사적 이벤트 추출**: 3년 동안 조건 만족한 **모든 날짜** 수집 (종목별)
3. **각 이벤트 일에 대해 D+N 수익률 계산**:
   ```
   R_1 = (close[t+1] - close[t]) / close[t]
   R_3 = (close[t+3] - close[t]) / close[t]
   R_7 = (close[t+7] - close[t]) / close[t]
   ```
4. **집계**:
   - `avg_return_1, avg_return_3, avg_return_7` = 평균
   - `max_return_1, max_return_3, max_return_7` = 최대
   - `win_rate_1, win_rate_3, win_rate_7` = 양의 수익률 / 전체 건수
   - `sample_count` = 건수

### 출력: `pattern_stats.json`
```json
{
  "meta": { "updated_at": "...", "lookback_days": 1100 },
  "by_stock_preset": {
    "005930": {
      "volume_spike": {
        "sample_count": 18,
        "d1": { "avg": 1.2, "max": 8.5, "win_rate": 61 },
        "d3": { "avg": 2.8, "max": 15.2, "win_rate": 66 },
        "d7": { "avg": 4.1, "max": 22.3, "win_rate": 72 }
      },
      "golden_cross": { ... }
    }
  }
}
```

### 주의사항
- 표본 **N < 5**인 경우는 통계 무의미 → UI에서 표시 생략
- 분할·유상증자 이벤트는 이상치(outlier) 발생 가능 → 5σ 이상 극단치 제거
- N_7 계산 시 시계열 끝 7일은 데이터 없어 스킵

Commit: `feat(phase-8): add historical pattern statistics calculator`

---

## Task 4: TypeScript 타입 + dataLoader 확장

**File:** `src/lib/types/indicators.ts`

```typescript
export interface SectorInfo {
  sector: string
  industry: string
  themes: string[]
}

export interface SectorsJson {
  [code: string]: SectorInfo
}

export interface ReturnStat {
  avg: number          // 평균 수익률 (%)
  max: number          // 최대 수익률 (%)
  win_rate: number     // 상승 확률 (0~100)
}

export interface PresetPatternStats {
  sample_count: number
  d1: ReturnStat
  d3: ReturnStat
  d7: ReturnStat
}

export interface PatternStatsJson {
  meta: { updated_at: string; lookback_days: number }
  by_stock_preset: {
    [code: string]: { [presetId: string]: PresetPatternStats }
  }
}
```

**File:** `src/lib/dataLoader.ts` — `loadSectors`, `loadPatternStats` 추가 (기존 IDB 캐싱 패턴 따름).

Commit: `feat(phase-8): add types and data loaders for sectors and pattern stats`

---

## Task 5: 테마 매칭 로직 (TDD)

**File:** `src/lib/themes/keywords.ts`

```typescript
export const THEME_DEFS: { id: string; label: string; keywords: string[] }[] = [
  { id: 'semiconductor', label: '반도체', keywords: ['반도체', '메모리', '파운드리'] },
  { id: 'battery', label: '2차전지', keywords: ['배터리', '2차전지', '양극재', '음극재'] },
  { id: 'ai', label: 'AI·소프트웨어', keywords: ['AI', '인공지능', '클라우드'] },
  { id: 'ev', label: '전기차', keywords: ['전기차', '자동차', 'EV'] },
  { id: 'security', label: '보안', keywords: ['보안', '안랩', '시큐'] },
  { id: 'bio', label: '바이오·헬스', keywords: ['바이오', '제약', '셀트리온'] }
]
```

**File:** `src/lib/themes/matcher.ts` + 테스트 3~5개.

Commit: `feat(phase-8): add theme keyword matcher (TDD)`

---

## Task 6: 5개 섹션 컴포넌트

각 섹션별 단일 컴포넌트:

### 섹션 1. TodayRecommendSection (기존 분리)
기존 `combo_golden + combo_value_rebound` 결과를 그대로.

### 섹션 2. LongTermSection
프리셋 조합:
```
alignment (정배열) 통과
AND ma60_turn_up (60일선 상승)
OR low_pbr (K=0.8) — PBR 매우 낮은 종목
```

### 섹션 3. HighGrowthSection (급등 예상)
커스텀 조건:
```
volume_spike (K=2.0) 
AND 최근 3일 연속 양봉 
AND close[t] > ma20
```

### 섹션 4. ThemeSection (테마별)
```
사용자가 테마 선택 (반도체/AI/2차전지 등)
→ sectors.json에서 해당 테마 종목 필터
→ 그 중 `combo_golden` 또는 `volume_spike` 통과한 것만
→ 카드 최대 6개
```

### 섹션 5. PredictedReturnSection (예측 수익률 Top 10)
```
pattern_stats.json 로드
각 종목의 매칭된 프리셋별 D+7 avg_return 중 최고값 계산
sample_count >= 5 인 것만
avg_return 내림차순 정렬 상위 10개
```

Commit: `feat(phase-8): add 5 beginner mode section components`

---

## Task 7: StockCardWithPrediction 컴포넌트

```tsx
interface Props {
  code: string
  name: string
  price: number
  tagLabel: string
  stats?: PresetPatternStats  // 없으면 확률 표시 안함
  basePath: string
}
```

UI:
```
┌─────────────────────────────┐
│ 🟢 중장기 상승 초입           │
│ 삼성전자   005930            │
│ 72,500원                     │
│ ─────────────────            │
│ D+1  +1.2%  (66% ↑)         │
│ D+3  +2.8%  (66% ↑)         │
│ D+7  +4.1%  (72% ↑)         │
│ 표본 18건                    │
└─────────────────────────────┘
```

예시 사진처럼 "이 종목은 과거 유사 상황에서 D+7 평균 +4.1%, 상승 확률 72%" 근사치 표시.

Commit: `feat(phase-8): add StockCardWithPrediction with D+N return stats`

---

## Task 8: BeginnerScreener 전면 개편

기존 단순 카드 그리드 → **세로 스크롤 5개 섹션**:

```tsx
export default function BeginnerScreener() {
  return (
    <div className="space-y-10">
      <TodayRecommendSection />
      <LongTermSection />
      <HighGrowthSection />
      <ThemeSection />
      <PredictedReturnSection />
    </div>
  )
}
```

각 섹션은 자체적으로 데이터 로드 + 렌더링. 로딩 중인 섹션은 skeleton 표시.

Commit: `feat(phase-8): rewrite BeginnerScreener with 5 sections`

---

## Task 9: 워크플로 통합 + Workprogress

### `.github/workflows/daily-update.yml`에 추가
```yaml
- name: Calculate pattern stats
  if: steps.trading.outputs.skip != 'true'
  run: |
    cd scripts
    python calculate_pattern_stats.py
```

순서: fetch → calculate_indicators → **fetch_sectors** → **calculate_pattern_stats** → fetch_fundamentals → push

### `scripts/build-with-data.sh`에 파일 2개 추가
```bash
FILES=(
  "stocks.json"
  "ohlcv.json"
  "indicators.json"
  "fundamentals.json"
  "updated_at.json"
  "sectors.json"          # 신규
  "pattern_stats.json"    # 신규
)
```

### Workprogress
`Workprogress/Phase_8_2026-04-15.md` — 작업 기록

Commit: `feat(phase-8): integrate sectors and pattern stats into pipeline`

---

## 📊 예상 영향

| 항목 | 변경 전 | 변경 후 |
|---|---|---|
| OHLCV 수집 기간 | 1년 | **3년** |
| 수집 시간 | 15~20분 | **25~35분** |
| data 브랜치 용량 | 10MB (gzip) | **25~30MB (gzip)** |
| 초보 모드 섹션 | 1개 | **5개** |
| 카드 정보 | 종목명·가격 | **+ D+N 예상 수익률·상승 확률** |
| 새 파일 | - | sectors.json, pattern_stats.json |

---

## ⚠️ 제약 및 주의사항

### 법적 리스크 재평가 필요
"상승 확률 72%" 같은 표현은 **투자 조언처럼 해석**될 여지가 있음. 다음 문구를 카드 또는 섹션에 명시:
```
* 과거 통계 기반 참고치일 뿐, 미래 수익을 보장하지 않습니다.
* 예측 수익률은 유사 과거 이벤트의 평균치입니다.
```

### 표본 수 부족 처리
종목 상장 기간이 짧으면 sample_count < 5 → 해당 종목 섹션 5에서 제외.

### pykrx 3년 데이터 안정성
현재 pykrx 1.0.45 + FDR 폴백은 ticker list만 폴백. OHLCV는 per-ticker pykrx 호출. 3년치 요청 시 일부 종목 시간 초과 가능 → 재시도 로직 강화 필요.

### UI 복잡도 증가
초보 모드가 너무 길어지면 스크롤 피로. 섹션별 접기/펼치기 토글 고려 (2차).

---

## 🏁 Phase 8 완료 조건

- [ ] OHLCV 3년 수집 정상 동작
- [ ] sectors.json, pattern_stats.json 생성 및 배포
- [ ] 초보 모드 5개 섹션 정상 렌더링
- [ ] D+N 예상 수익률·상승 확률 카드에 표시
- [ ] 테스트 추가 (스캐너·매처·로더)
- [ ] 법적 고지 문구 추가
- [ ] 사용자 확인 후 PR 머지

---

## 📝 우선순위 제안

**MVP (Phase 8-1, 2일)**
- Task 1 (3년 확장)
- Task 4 (타입)
- Task 5 (테마 매처)
- Task 6 중 섹션 1, 2, 3 (오늘 추천 / 장기 / 급등)
- Task 8 (BeginnerScreener 개편)

**확장 (Phase 8-2, 2일)**
- Task 2 (섹터 수집)
- Task 3 (패턴 통계)
- Task 6 중 섹션 4, 5 (테마 / 예측)
- Task 7 (StockCardWithPrediction)
- Task 9 (워크플로 통합)

총 **4~5일 작업 분량**. 병렬로 못 가고 순차 진행 필요 (데이터 파이프라인 변경 후 프런트 구현).
