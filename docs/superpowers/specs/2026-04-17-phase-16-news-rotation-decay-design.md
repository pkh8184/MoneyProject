# Phase 16 — 뉴스·DART 연동 + 섹터 로테이션 + 시간 감쇠 설계

**Date**: 2026-04-17
**Status**: Draft (awaiting review)
**Scope**: Phase 15까지 수집·검증한 정량 기반 위에 **질적 신호**(뉴스/공시) 자동 탐지, **시장 흐름**(섹터 로테이션) 가산, **시간 효과**(decay) 3가지를 더해 정확도 추가 상승.

---

## 🎯 목적

Phase 15 한계:
- 지정학·테마 팩터는 **수동 기간 지정** (러우전쟁 2022-02-24~ 등) — 실시간 업데이트 없음
- 팩터가 켜지면 **시간 무관 동일 가중치** — 오래 켜두면 효과 흐려짐
- 최근 30일 섹터 **주도 흐름**이 스코어에 반영 안 됨

Phase 16 개선:
1. **16a. 섹터 로테이션**: 최근 30일 섹터별 평균 등락률 계산 → 강세 섹터 가산, 약세 섹터 감산 (작지만 즉시 효과)
2. **16b. 시간 감쇠**: 자동 감지된 팩터가 N일 이상 지속 시 weight 점진 감소
3. **16c. 뉴스·DART 연동**: 뉴스 RSS + 공시로 지정학·테마 팩터 자동 활성화

---

## ✅ 범위 (세 개의 서브 페이즈)

### Phase 16a — 섹터 로테이션 (1~2일)
- Python: 최근 30일 섹터별 수익률 계산 → `sector_rotation.json`
- TS: `sectorRotationBonus()` 함수 추가
- `scoring.ts`의 computeMacroBonus에 통합 (팩터와 별개 레이어)
- UI: `MacroDetailPanel`에 섹터 가산 표시, `FactorCard` 섹터 로테이션 카드 별도

### Phase 16b — 시간 감쇠 (1일)
- Phase 14 자동 감지 팩터에 `autoActivatedAt` timestamp 저장
- 수동 토글은 감쇠 **없음** (사용자가 직접 켰으므로)
- Decay 함수: 30일 후 70%, 60일 후 40%, 90일 후 20%, 120일+ 10%
- UI: `FactorCard`에 "활성 기간 N일" 표시

### Phase 16c — 뉴스·DART 연동 (3~4일)
- Python: 네이버 뉴스 RSS 키워드 감지 → `news_signals.json`
- Python: DART OpenAPI 공시 감지 → `dart_signals.json` (개별 종목 수준)
- TS: 뉴스 기반 자동 탐지 확장 (Phase 14 useMacroAutoDetect 통합)
- UI: 자동 감지 카드에 "뉴스 근거: ..." 출처 표시
- 개별 종목 공시 이벤트는 종목 상세에 배지

---

## 📊 16a — 섹터 로테이션 상세 설계

### 데이터 수집

**Python** (기존 데이터만으로 계산 가능, 신규 API 불필요):

```python
# scripts/calculate_sector_rotation.py

# 입력: sectors.json + 각 종목 ohlcv/{code}.json
# 처리:
#   1. 각 테마별 소속 종목들의 지난 30일 평균 수익률 계산
#   2. TOP 3 강세 / BOTTOM 3 약세 선정
#   3. 각 테마에 강도 점수 부여 (강세 +3~10, 약세 -3~10)
# 출력: public/data/sector_rotation.json
```

**JSON 스키마**:
```json
{
  "updated_at": "2026-04-17T18:00:00+09:00",
  "period_days": 30,
  "sectors": [
    { "theme": "방산", "avg_return_pct": 8.3, "sample_stocks": 12, "rank": "strong" },
    { "theme": "반도체", "avg_return_pct": 5.1, "sample_stocks": 48, "rank": "strong" },
    { "theme": "바이오", "avg_return_pct": -4.2, "sample_stocks": 137, "rank": "weak" },
    ...
  ]
}
```

**강세/약세 분류**:
- 평균 수익률 ≥ +5% 또는 TOP 3 → `rank: 'strong'` (보너스 +3)
- 평균 수익률 ≤ -5% 또는 BOTTOM 3 → `rank: 'weak'` (감산 -3)
- 나머지 → `rank: 'neutral'` (0)

### 스코어 통합

**TypeScript 함수** (`src/lib/macro/sectorRotation.ts`):

```typescript
export interface SectorRotationBonus {
  sectorRotationDelta: number  // +3 / 0 / -3
  activeSector: string | null  // 매칭된 테마
  rank: 'strong' | 'weak' | 'neutral' | null
}

export function computeSectorRotationBonus(
  themes: string[] | undefined,
  rotation: SectorRotationJson | null
): SectorRotationBonus {
  if (!themes || !rotation) return { sectorRotationDelta: 0, activeSector: null, rank: null }
  // 종목의 테마 중 rotation에 매칭되는 첫 번째 찾기
  for (const t of themes) {
    const match = rotation.sectors.find((s) => s.theme === t)
    if (match) {
      if (match.rank === 'strong') return { sectorRotationDelta: 3, activeSector: t, rank: 'strong' }
      if (match.rank === 'weak') return { sectorRotationDelta: -3, activeSector: t, rank: 'weak' }
      return { sectorRotationDelta: 0, activeSector: t, rank: 'neutral' }
    }
  }
  return { sectorRotationDelta: 0, activeSector: null, rank: null }
}
```

**통합**: `filter.ts`의 `enrichWithMacro`에서 각 종목에 별도 필드로 추가:
```typescript
return {
  ...r,
  macroBonus: bonus,
  sectorRotationBonus,
  finalScore: r.score + bonus.total + sectorRotationBonus.sectorRotationDelta
}
```

### UI

**MacroDetailPanel**:
```
🌍 현재 환경에서의 위치
  🟢 AI 붐           +8   (수혜)
  🔴 금리 인상기     -8   (피해)
  ─────────────
  ⚡ 섹터 로테이션 (반도체 🔥)  +3
  ─────────────
  합계              +3
```

**별도 SectorRotationCard** (기존 /environment 페이지에):
```
⚡ 오늘의 섹터 흐름 (최근 30일)
🔥 강세: 방산 +8.3% · 반도체 +5.1% · AI +4.8%
❄️ 약세: 바이오 -4.2% · 화장품 -3.5%
```

---

## 📊 16b — 시간 감쇠 상세 설계

### 데이터 모델

기존 `useMacroFactors`의 Store 확장:

```typescript
interface Store {
  version: 2  // 마이그레이션용 (기존 v1 호환)
  activeIds: string[]
  activatedAt: Record<string, number>  // factorId → Unix ms (자동 감지된 것만)
}
```

**수동 토글 처리**:
- 사용자가 직접 토글한 경우 → `activatedAt`에 저장 **안 함** (decay 없음)
- 자동 탐지가 사용자 activeIds에 자동 추가하지 않고 별도 표시됐으므로, 이 로직은 실제로 **사용자가 "전부 켜기" 버튼을 누른 시점**에 timestamp 기록

```typescript
const applyAllAutoDetected = useCallback(() => {
  const now = Date.now()
  setStore((prev) => {
    const next = [...prev.activeIds]
    const activated = { ...prev.activatedAt }
    for (const id of autoDetectedIds) {
      if (!next.includes(id)) {
        next.push(id)
        activated[id] = now
      }
    }
    return { version: 2, activeIds: next, activatedAt: activated }
  })
}, [autoDetectedIds, setStore])
```

### Decay 함수

```typescript
// src/lib/macro/decay.ts

const DAY_MS = 24 * 60 * 60 * 1000

export function computeDecayFactor(activatedAtMs: number | undefined, nowMs: number = Date.now()): number {
  if (activatedAtMs == null) return 1  // 수동 토글 or 미지정 → 감쇠 없음
  const ageDays = (nowMs - activatedAtMs) / DAY_MS
  if (ageDays < 14) return 1.0       // 2주 이내: 100%
  if (ageDays < 30) return 0.85      // 4주: 85%
  if (ageDays < 60) return 0.70      // 8주: 70%
  if (ageDays < 90) return 0.50      // 12주: 50%
  if (ageDays < 120) return 0.30     // 16주: 30%
  return 0.20                         // 16주+: 20%
}
```

### scoring.ts 통합

```typescript
export function computeMacroBonus(
  stockName: string,
  themes: string[] | undefined,
  activeFactors: MacroFactor[],
  activatedAt?: Record<string, number>  // 신규
): MacroBonus {
  const detail: MacroBonusDetail[] = []
  for (const f of activeFactors) {
    const decay = activatedAt ? computeDecayFactor(activatedAt[f.id]) : 1
    const weight = Math.round(f.weight * decay)
    let delta = 0
    if (matchesFactor(stockName, themes, f.beneficiaries)) delta += weight
    if (matchesFactor(stockName, themes, f.losers)) delta -= weight
    if (delta !== 0) {
      detail.push({ factorId: f.id, factorName: f.name, delta, role: delta > 0 ? 'benefit' : 'loss' })
    }
  }
  return { total: detail.reduce((s, d) => s + d.delta, 0), detail }
}
```

### UI

**FactorCard**:
```
🟢 AI 붐 [💡 자동 감지] [강도: ±8]
활성 14일 · 효과 100%

→ 60일 후:
🟢 AI 붐 [💡 자동 감지] [강도: ±8 → ±6]
활성 62일 · 효과 70% (감쇠 중)
```

---

## 📊 16c — 뉴스·DART 연동 상세 설계

### 네이버 뉴스 RSS (간단 버전)

**Python** (`scripts/fetch_news_signals.py`):

```python
import feedparser
import re

NEWS_FEEDS = [
    'https://news.naver.com/rss/economy.rss',
    'https://www.yna.co.kr/rss/economy.xml',
]

FACTOR_KEYWORDS = {
    'war_ongoing': ['전쟁', '우크라이나', '러시아 침공', '이스라엘'],
    'oil_up': ['유가 급등', '원유 상승', 'WTI'],
    'rate_hike': ['금리 인상', '연준', 'FOMC'],
    'us_china': ['미중 갈등', '관세', '반도체 제재'],
    'ai_boom': ['AI 붐', 'ChatGPT', '엔비디아'],
    # ...
}

def fetch_news_signals():
    # 24시간 내 뉴스에서 키워드 카운트
    # 출력: { factorId: {count, sample_titles[]} }
```

**출력 스키마** (`news_signals.json`):
```json
{
  "updated_at": "...",
  "period_hours": 24,
  "signals": {
    "war_ongoing": { "count": 15, "sample_titles": ["우크라이나 전선 확대...", ...] },
    "oil_up": { "count": 8, "sample_titles": [...] }
  }
}
```

### DART OpenAPI 공시 (선택)

**API 키 필요** (환경변수 `DART_API_KEY`). 없으면 skip.

```python
# scripts/fetch_dart_signals.py
import requests

DART_API_KEY = os.environ.get('DART_API_KEY')

# 공시 타입별 종목 영향 맵
REPORT_IMPACTS = {
    '공급계약체결': 'positive',
    '단일판매·공급계약': 'positive',
    '최대주주변경': 'neutral',
    '영업정지': 'negative',
    # ...
}
```

**출력** (`dart_signals.json`):
```json
{
  "updated_at": "...",
  "period_days": 3,
  "signals": [
    { "code": "005930", "report_type": "공급계약", "impact": "positive", "date": "2026-04-17", "title": "..." }
  ]
}
```

### TS 통합

**useMacroAutoDetect 확장**:
```typescript
// 뉴스에서 특정 팩터 키워드 언급 많으면 자동 탐지 ID에 추가
if (newsSignals) {
  for (const [factorId, sig] of Object.entries(newsSignals.signals)) {
    if (sig.count >= 5 && !detected.includes(factorId)) {
      detected.push(factorId)
    }
  }
}
```

**자동 감지 카드에 근거 표시**:
```
🤖 자동 감지됨 (5개)
🔴 전쟁·분쟁 지속 [💡 자동 감지]
    📰 뉴스 근거: "우크라이나 전선 확대..." 외 14건
```

**종목 상세 DART 배지**:
```
종목 상세 > 최근 공시
📢 2026-04-15 공급계약체결 (100억원, 3년)
```

---

## 🗂 파일 구조

```
scripts/
├── calculate_sector_rotation.py    [16a 신규]
├── fetch_news_signals.py           [16c 신규]
├── fetch_dart_signals.py           [16c 신규 선택]

.github/workflows/
├── daily-update.yml                [수정 — 3개 스크립트 단계 추가]

public/data/
├── sector_rotation.json            [16a 신규]
├── news_signals.json               [16c 신규]
├── dart_signals.json               [16c 선택]

src/
├── lib/
│   ├── macro/
│   │   ├── sectorRotation.ts       [16a 신규]
│   │   ├── decay.ts                [16b 신규]
│   │   ├── scoring.ts              [수정 — decay 반영]
│   │   ├── useMacroFactors.ts      [수정 — activatedAt 추적]
│   │   ├── useMacroAutoDetect.ts   [수정 — news_signals 통합]
│   │   └── __tests__/
│   │       ├── sectorRotation.test.ts  [신규]
│   │       ├── decay.test.ts           [신규]
│   │       └── scoring.test.ts         [수정 — decay 케이스]
│   ├── dataLoader.ts               [수정 — 3개 로더 추가]
│   ├── filter.ts                   [수정 — sectorRotationBonus 주입]
│   └── types/indicators.ts         [수정 — 3개 JSON 타입]
├── components/macro/
│   ├── MacroDetailPanel.tsx        [수정 — decay·rotation 표시]
│   └── SectorRotationCard.tsx      [16a 신규]
├── app/[basePath]/
│   ├── environment/
│   │   ├── EnvironmentView.tsx     [수정 — SectorRotationCard]
│   │   └── FactorCard.tsx          [수정 — 활성 기간 표시]
│   └── stock/[code]/
│       └── StockDetail.tsx         [수정 — DART 공시 배지]
└── lib/strings/ko.ts               [수정 — sectorRotation + decay + news]
```

---

## 🧪 테스트 전략

### 단위 테스트 (신규)

**sectorRotation.test.ts**:
```
- returns 0 when no rotation data
- returns +3 for strong sector match
- returns -3 for weak sector match
- returns 0 for neutral rank
- picks first matching theme
```

**decay.test.ts**:
```
- returns 1.0 before 14 days
- returns 0.85 at 20 days
- returns 0.70 at 40 days
- returns 0.50 at 75 days
- returns 0.20 after 120 days
- returns 1.0 when activatedAt undefined (manual toggle)
```

**scoring.test.ts** (수정):
- decay factor 반영된 weight 계산 확인
- activatedAt 없으면 기존 weight 그대로

### Python (수동 검증)
- `calculate_sector_rotation.py` 로컬 실행 → JSON 스키마 확인
- `fetch_news_signals.py` RSS 파싱 결과 확인

---

## 🚀 작업 순서 (23 태스크 총)

### Phase 16a — 섹터 로테이션 (8 tasks, 1.5일)

1. `calculate_sector_rotation.py`
2. TS 타입 + 로더
3. `sectorRotation.ts` 함수 + 테스트
4. `filter.ts` 통합
5. `SectorRotationCard` 컴포넌트
6. `EnvironmentView` 통합
7. `MacroDetailPanel` 섹터 라인 추가
8. 워크플로 + 커밋

### Phase 16b — 시간 감쇠 (5 tasks, 1일)

9. `decay.ts` 함수 + 테스트
10. Store v2 + 마이그레이션 + activatedAt 추적
11. `scoring.ts` decay 반영 + 테스트 수정
12. `FactorCard` 활성 기간 표시
13. 커밋

### Phase 16c — 뉴스·DART (10 tasks, 3일)

14. `fetch_news_signals.py` (RSS + 키워드)
15. `fetch_dart_signals.py` (DART API, 선택)
16. TS 타입 + 로더
17. `useMacroAutoDetect` 뉴스 통합
18. 자동 감지 카드 근거 표시
19. 종목 상세 DART 공시 배지
20. 워크플로 통합
21. `DART_API_KEY` 시크릿 세팅 문서화
22. QA
23. PR

**총 약 5~6일**. 각 서브 페이즈별 PR 권장 (이해·리뷰 쉬움).

---

## ⚠️ 리스크

| 리스크 | 대응 |
|---|---|
| 뉴스 RSS 불안정 | feedparser 예외 처리 + 폴백 |
| DART API 키 없음 | `DART_API_KEY` 없으면 스크립트 스킵, UI는 조용히 숨김 |
| 뉴스 키워드 오탐 (false positive) | count ≥ 5 임계값 + 수동 on/off 유지 |
| Decay factor 과도한 감쇠 | 임계값 조정 가능, 초기엔 보수적(0.85 20일+) |
| 섹터 로테이션 vs 개별 팩터 중복 가산 | 명시적 분리 표시, 합계 = macro total + rotation |
| localStorage v1 → v2 마이그레이션 | 기존 데이터 파싱 후 activatedAt 빈 객체로 초기화 |

---

## 📊 기대 개선

Phase 15 대비:
- **섹터 로테이션**: +2~4%p (단기 주도 종목 가산)
- **시간 감쇠**: +1~3%p (오래된 팩터 과대 평가 방지)
- **뉴스·DART**: +3~5%p (자동 탐지 커버리지 확대)

**종합 정확도**: Phase 15 (82~92%) → **86~95%** (+4~5%p)

실제 숫자는 실측 후 조정.

---

## 🔜 Phase 17+

1. ML 모델 (LightGBM) — 모든 피처 통합 예측
2. 사용자 가중치 슬라이더
3. 알림 (자동 감지 변경 시)
4. 시장 체온계 (방어장/위험회피 판정)

---

## ❓ 확정 전 확인

1. **Phase 16을 3개 PR로 분리** OK? (16a → 16b → 16c 순차)
2. **DART API 키** 취득 가능? (없으면 16c에서 뉴스만)
3. **Decay 임계값** (14/30/60/90/120일 기준) OK?
4. **섹터 로테이션 가산** ±3점 적절? 더 강/약하게?
5. **뉴스 키워드 count ≥ 5** 임계값 OK?
