# Phase 19 — 종목 상세 "오늘의 체크포인트" 패널 설계 (UX 개선판)

**Date**: 2026-04-17
**Status**: Draft (awaiting review)
**Scope**: 종목 상세 페이지에 **"이 종목의 긍정 신호와 주의 신호"** 를 한눈에 보이는 요약 패널을 추가.

---

## 🎯 목적

기존 상세 페이지는 지표·차트·매칭 프리셋을 개별 표시 → 사용자가 **종합 해석하기 어려움**.

**개선 목표**:
- **압축된 12개 신호**로 한눈에 체크
- **중립 톤** ("체크포인트", "긍정·주의") — 예측 단정 회피
- **기존 패널과 역할 분리**: 요약 vs 상세 (링크로 연결)

---

## 🔧 2차 검증 반영 (10건)

| 분류 | 내용 | 반영 |
|---|---|---|
| 🔴 RSI 반등 두 조건 상호 배타적 | 과매도 이탈과 50~70 모멘텀은 동시 불가 | 조건별 **분기 처리**, 최고 강도 하나만 |
| 🔴 수급 "20일 평균 × 2" 계산 불가 | foreign_net 10일치만 존재 | 조건 **제거** |
| 🔴 52주 신고가 정확 일치 드묾 | close == high52w 조건 | **돌파** 로직 (어제 < 52w ≤ 오늘) |
| 🟡 매크로 팩터 미활성 시 null | 사용자가 /environment 켜야만 신호 | 섹터 로테이션만 있어도 ⭐ |
| 🟡 ML 모델 미훈련 시 null | predictions.json 없음 | 이미 null 스킵 (변경 없음) |
| 🟡 과거 승률 — matched IDs | DetectContext에 명시 필요 | `matchedPresetIds` 인자 명시 |
| 🟡 밥그릇 phase 중복 계산 | BowlPhaseIndicator에도 있음 | `src/lib/bowl/detectPhase.ts` 공통 util |
| 🟡 PER 업종 비교 불가 | 섹터별 평균 없음 | 고정 임계값 유지, **Phase 20+ 로 표시** |
| 🟢 거래량 감소 × 0.5 너무 엄격 | 50% 감소는 희귀 | × 0.7 로 완화 |
| 🟢 바닥 반등 강도 단일 | 연속 터치도 동일 강도 | ⭐⭐ 단일 / ⭐⭐⭐ 연속 세분화 |

---

## 🔧 3차 검증 반영 (7건)

| 분류 | 내용 | 반영 |
|---|---|---|
| 🔴 IX1 | indicators.json close 30일만 → 60일 신고가 계산 불가 | **DetectContext에 `ohlcvFull` 추가** (전체 5년 history 활용) |
| 🟡 IX2 | 기존 패널 anchor ID 없음 → "자세히 →" 링크 작동 안 함 | 각 패널에 **`id` 부여**, Signal.linkAnchor 값 지정 |
| 🟡 IX3 | 매크로·매칭 계산 중복 | **StockDetail 레벨에서 공통 계산** → props로 내림 |
| 🟡 IX4 | "오늘" 라벨 부정확 (어제 종가 기준) | **"어제 종가 기준"** / "최근" 으로 표현 순화 |
| 🟢 IX5 | 강도 "3개 이상 ⭐⭐⭐" 명확성 | **⭐⭐⭐ = 3개 이상 (4개 포함)** 명시 |
| 🟢 IX6 | 주의 섹션 색상 명세 누락 | **bg-yellow-50 dark:bg-yellow-900/20** 명시 |
| 🟢 IX7 | 접힘 상태 저장 여부 | **Phase 19엔 미저장**, Phase 20+ 로 보류 |

---

## ⚠️ 1차 설계 UX 이슈 반영 (29 → 12개로 압축)

| 이슈 | 해결 |
|---|---|
| 신호 29개 — 과부하 | **12개로 통합** (유사 신호 합치기) |
| "상승 요인 분석" 제목 — 예측으로 오해 | **"오늘의 체크포인트"** 중립 제목 |
| 전문 용어 (MACD 골든크로스) | **쉬운 표현** (단기 추세 전환) |
| 기존 패널과 중복 | **요약 역할**, **"자세히 →"** 링크로 기존 패널 연결 |
| 긍정·주의 혼재 혼란 | 상단 **요약 뱃지** (긍정 5 · 주의 2) |
| 신호 동일 비중 | **강도 ⭐ (1~3)** 표시 |
| 발생 시점 불명 | **"오늘" / "진행 중" / "3일 전"** 라벨 |
| 모바일 스크롤 길어짐 | 모바일 **기본 접힘** (헤더 요약만) |

---

## 📋 12개 신호 정의

각 신호는 **여러 세부 조건을 묶어서** 하나의 신호로 집계. 강도는 세부 조건 충족 개수에 따라 ⭐ 1~3.

### 📈 차트 (5개)

#### 1. 단기 추세 전환
**사용자 의미**: "단기 흐름이 위쪽으로 바뀌는 중"
- MA20 > MA60 상향 돌파 (최근 3일) — `golden_cross`
- MACD 라인 > 신호선 상향 돌파 (최근 3일) — `macd_cross`
- MACD 히스토그램 음→양 전환 (최근 3일) — `macd_hist_positive`
- MA5 > MA20 > MA60 정배열 (MA120 미만)

**강도**:
- ⭐ 1개 충족
- ⭐⭐ 2개 충족
- ⭐⭐⭐ **3개 이상 충족 (4개 전부 충족도 ⭐⭐⭐)**

**시점**: 가장 최근 충족 조건 기준 ("어제 종가 기준" 또는 "최근 3일")

#### 2. 거래량 이상 (매수세 유입)
**사용자 의미**: "평소보다 많은 사람이 사고 있음"
- 오늘 거래량 ≥ 20일 평균 × 1.5 & 양봉 — `volume_spike`
- 최근 10일 평균 거래량 > 이전 10일 평균 × 1.3 — `volume_slope_up`

**강도**:
- ⭐ 1개
- ⭐⭐ 2개 (급증 + 추세 증가 동시)

#### 3. RSI 구간 양호
**사용자 의미**: "RSI 기준 매수하기 유리한 구간"
세 가지 중 **하나만** 충족 시 신호. 동시 불가 (RSI 값 범위가 배타적).

- A. **과매도 이탈**: RSI 오늘 ≥ 30, 어제 < 30 → **⭐⭐** (강력, 반등 초입)
- B. **과매도 회복**: 30 < RSI < 50 & 5일 전 대비 상승 → **⭐** (약, 회복 중)
- C. **건강한 모멘텀**: 50 ≤ RSI ≤ 70 & 5일 전 대비 상승 → **⭐** (안정적)

**구현**: 우선순위 A > C > B 순으로 검사, 첫 충족 시 해당 강도로 반환.

#### 4. 신고가 돌파
**사용자 의미**: "오랜 저항을 뚫음 — 강한 추세"

**돌파 로직** (정확 일치 대신 실질적 돌파 검사):
- 어제 close < 52주 고점 AND 오늘 close ≥ 52주 고점 → **52주 돌파**
- 어제 close < 60일 고점 AND 오늘 close ≥ 60일 고점 → **60일 돌파**
- 위가 아니더라도 close ≥ 52주 고점 × 0.995 → **52주 근접**

**강도**:
- ⭐ 60일 돌파 또는 52주 근접
- ⭐⭐ 60일 돌파 + 52주 근접 동시
- ⭐⭐⭐ 52주 실질 돌파

#### 5. 바닥 터치 반등
**사용자 의미**: "저점 찍고 올라오는 기술적 반등"

**조건**:
- 최근 5일 중 1일 이상 close ≤ 볼린저 하단 터치
- 오늘 close > 어제 close (반등 시작)

**강도**:
- ⭐⭐ 단일 터치 후 반등 (최근 5일 중 1회)
- ⭐⭐⭐ **연속 터치** 후 반등 (최근 5일 중 2회 이상 OR 최근 3일 연속)

### 💰 수급 (1개)

#### 6. 수급 강세
**사용자 의미**: "큰손이 계속 사고 있음"

**조건** (foreign_net / institution_net 모두 10일 데이터만 존재):
- 외국인 최근 10일 중 7일+ 순매수
- 기관 최근 10일 중 7일+ 순매수
- (보너스) 오늘 외국인 순매수가 최근 10일 중 최대

**강도**:
- ⭐ 외국인 or 기관 단독
- ⭐⭐ 둘 중 하나 + 오늘 최대 매집일
- ⭐⭐⭐ 외국인 + 기관 동시 (쌍끌이)

### 🌍 매크로 (1개)

#### 7. 매크로 환경 수혜
**사용자 의미**: "지금 시장 분위기가 이 종목에 유리"

**조건** (사용자가 `/environment`에서 팩터 켜지 않아도 섹터 로테이션만으로 감지 가능):
- macroBonus total > 0 (사용자 활성 팩터 기반)
- 섹터 로테이션 strong (+3)

**강도**:
- ⭐ macroBonus 1~5 OR 섹터만 strong (팩터 미활성)
- ⭐⭐ macroBonus 6~15 OR (팩터 + 섹터 둘 다 유리하지만 합 ≤ 15)
- ⭐⭐⭐ 팩터 + 섹터 동시 & total ≥ 15

**사용자 팩터 0개 활성 상태**: macroBonus=0. 섹터 로테이션만으로 ⭐ 가능.

**시점**: "진행 중"

### 🤖 ML (1개)

#### 8. ML 예측 긍정
**사용자 의미**: "AI 모델이 상승 가능성 높다고 판단"
- probability ≥ 0.6 — 긍정
- probability ≥ 0.8 — 강력 긍정

**강도**:
- ⭐ 0.6~0.7
- ⭐⭐ 0.7~0.85
- ⭐⭐⭐ 0.85+

**상세**: "D+20 초과수익 확률 72% · 근거: RSI, 거래량, MA5"

### 📊 과거 유사 패턴 (1개)

#### 9. 과거 승률 양호
**사용자 의미**: "같은 신호일 때 과거에 자주 올랐음"
- 매칭 프리셋의 D+14 평균 승률 ≥ 60% & sample_count ≥ 5

**강도**:
- ⭐ 60~70%
- ⭐⭐ 70~80%
- ⭐⭐⭐ 80%+

**상세**: "과거 10건 중 6건 상승 (승률 60%)"

### 🍚 밥그릇 (1개)

#### 10. 밥그릇 공이 구간
**사용자 의미**: "바닥 다지기 끝, 상승 시작 구간"

**조건** (phase 판정은 `src/lib/bowl/detectPhase.ts` 공통 util로 추출 — `BowlPhaseIndicator` 와 재사용):
- bowl phase 3 (공이) 진입
- bowl_volume_score ≥ 70 (보너스)
- bowl_has_recent_golden_cross === true (보너스)

**강도**:
- ⭐ phase 3 진입
- ⭐⭐ phase 3 + volume_score ≥ 70
- ⭐⭐⭐ 모든 조건 만족

### ⚠️ 주의 (2개)

#### 11. 과열·고점 근접
**사용자 의미**: "단기 조정 가능성 — 주의"

**조건**:
- RSI > 70 — 과매수
- close ≥ 52주 고점 × 0.95 — 고점 근접
- PER > 50 — 고PER (업종 평균 비교는 Phase 20+, 현재 고정 임계값)

**강도**:
- ⭐ 1개
- ⭐⭐ 2개
- ⭐⭐⭐ 3개 전부

#### 12. 하락 추세
**사용자 의미**: "전반적 흐름이 하향 — 반등 대기"

**조건**:
- MA5 < MA20 < MA60 < MA120 (역배열)
- 최근 5일 평균 거래량 ≤ 20일 평균 × 0.7 (관심 이탈 — 완화된 임계값)

**강도**:
- ⭐ 1개
- ⭐⭐ 2개 (역배열 + 거래량 이탈)

---

## 🎨 UI 레이아웃

### 데스크톱 (기본 펼침)

```
┌────────────────────────────────────────────────────────┐
│ 22,950원  +1,900 (+9.03%)                              │
├────────────────────────────────────────────────────────┤
│ 📊 오늘의 체크포인트       [긍정 5 · 주의 1]  [접기▲] │
│ ℹ️ 데이터 기준: 어제 종가 · 뉴스·공시는 추적 안 함     │
├────────────────────────────────────────────────────────┤
│                                                        │
│ 📈 차트                                                │
│   ⭐⭐⭐ 단기 추세 전환 (오늘)                        │
│        MA·MACD 동시 상승 전환 → 자세히                │
│   ⭐⭐  거래량 이상 (오늘)                             │
│        평균 대비 2.3배 · 매수세 유입                   │
│   ⭐   RSI 반등 구간 (진행 중)                         │
│        과매도(28) 탈출 → 현재 63                       │
│                                                        │
│ 💰 수급                                                │
│   ⭐⭐⭐ 수급 강세 (진행 중)                           │
│        외국인·기관 10일 중 8일 매수 → 자세히          │
│                                                        │
│ 🌍 매크로                                              │
│   ⭐⭐  매크로 환경 수혜 (진행 중)                     │
│        AI 붐 + 반도체 섹터 강세 (+11) → 자세히        │
│                                                        │
│ ⚠️ 주의                                                │
│   ⭐   고점 근접 (현재)                                │
│        52주 고점 대비 95%                              │
└────────────────────────────────────────────────────────┘
```

### 모바일 (기본 접힘)

```
┌─────────────────────────────────┐
│ 📊 오늘의 체크포인트            │
│ [긍정 5 · 주의 1]        [▼]   │
└─────────────────────────────────┘
```

탭 시 전체 펼침 → 데스크톱과 동일 내용. **접힘 상태 localStorage 저장 안 함** (Phase 19 범위). 사용자는 매번 탭해서 펼침 — Phase 20+ 에서 기억 기능 추가 고려.

### 색상·스타일

- 전체 패널: 기존 Card 컴포넌트 (`bg-bg-primary-light dark:bg-bg-primary-dark`)
- 긍정 카테고리: 기본 배경
- 주의 카테고리: **`bg-yellow-50 dark:bg-yellow-900/20`** 로 구분
- ⭐ 강도: 회색 (`text-text-secondary-light dark:text-text-secondary-dark`)
- 카테고리 아이콘: 기존 이모지 사용 (📈 💰 🌍 🤖 📊 🍚 ⚠️)

### 신호 0개일 때

```
┌────────────────────────────────────┐
│ 📊 오늘의 체크포인트               │
│ 감지된 신호 없음                   │
│ 뉴스·공시·실적 이슈일 수 있어요    │
└────────────────────────────────────┘
```

### 주의만 있을 때

```
⚠️ 주의 신호 1개 · 긍정 0개
과열·고점 근접 신호 감지
```

---

## 🏷 기존 패널 anchor ID 부여 (IX2)

StockDetail의 각 기존 패널을 **`<section id="...">`** 로 감싸 anchor 지정.
`StockMomentumPanel`의 "자세히 →" 링크는 `#matched-presets` 같은 in-page anchor로 스크롤.

```tsx
// StockDetail.tsx — 각 패널 감싸기
<section id="matched-presets">
  <MatchedPresets stock={stock} fundamental={fundamental} />
</section>
<section id="bowl-phase">
  <BowlPhaseIndicator stock={stock} />
</section>
<section id="bowl-volume">
  <BowlVolumePanel stock={stock} fundamental={fundamental} />
</section>
<section id="macro-detail">
  <MacroDetailPanel stockName={stock.name} themes={...} basePath={basePath} code={code} />
</section>
<section id="ml-prediction">
  <MLPredictionPanel code={code} />
</section>
```

각 Signal 객체의 `linkAnchor` 필드에 해당 ID (예: `'matched-presets'`) 기록.
UI에서 `<a href={`#${signal.linkAnchor}`}>자세히 →</a>` 로 렌더.

---

## 🔗 기존 패널과의 관계

**요약 ↔ 상세 분리**:

| 새 패널 (요약) | 기존 패널 (상세) |
|---|---|
| 단기 추세 전환 ⭐⭐⭐ | `MatchedPresets` 골든크로스·MACD 상세 |
| 거래량 이상 ⭐⭐ | `BowlVolumePanel` 6단계 거래량 점수 |
| 매크로 환경 수혜 ⭐⭐ | `MacroDetailPanel` 팩터별 가산 |
| ML 예측 긍정 ⭐⭐⭐ | `MLPredictionPanel` 확률·상위 피처 |
| 밥그릇 공이 구간 ⭐ | `BowlPhaseIndicator` 4단계 |

각 요약 항목에 **"자세히 →"** 링크 → 같은 페이지 기존 패널로 스크롤 (anchor).

기존 패널은 **그대로 유지** — 상세 분석용.

---

## 🏗 타입 정의

```typescript
// src/lib/stockMomentum/types.ts

export type SignalCategory =
  | 'chart' | 'supply' | 'macro' | 'ml' | 'historical' | 'bowl' | 'warning'

export type SignalTone = 'bullish' | 'warning'

/**
 * 신호 발생 시점
 *  - 'latest'  : 최신 영업일(어제 종가 기준) — UI 표시: "어제 종가 기준"
 *  - 'recent'  : 최근 3~5 영업일 내 — UI 표시: "최근"
 *  - 'ongoing' : 현재 지속 상태 — UI 표시: "진행 중"
 */
export type SignalTiming = 'latest' | 'recent' | 'ongoing'

export interface Signal {
  id: string                // 'short_term_trend_change', 'volume_anomaly' 등
  category: SignalCategory
  tone: SignalTone
  strength: 1 | 2 | 3       // ⭐ 개수
  timing: SignalTiming
  label: string             // "단기 추세 전환"
  description: string       // "MA·MACD 동시 상승 전환"
  detail?: string           // 선택: 구체 수치
  linkAnchor?: string       // 기존 패널 anchor ID (예: '#matched-presets')
}

export interface MomentumAnalysis {
  signals: Signal[]
  bullishCount: number
  warningCount: number
}

// 기존 패널 anchor ID (StockDetail의 각 패널 <section id=""> 지정 필요)
export const PANEL_ANCHORS = {
  matchedPresets:  'matched-presets',
  bowlPhase:       'bowl-phase',
  bowlVolume:      'bowl-volume',
  macroDetail:     'macro-detail',
  mlPrediction:    'ml-prediction'
} as const
```

---

## 🔄 StockDetail 공통 계산 흐름 (IX3)

여러 패널이 같은 계산 중복 → **StockDetail 레벨에서 한 번 계산** 후 props로 전달.

```tsx
// StockDetail.tsx 내부 (일부)

// 1) 기존 데이터 로드 (indicators, fundamentals, sectors, ohlcvFull, predictions ...)

// 2) 공통 계산 (useMemo로 캐싱)
const { activeFactors } = useMacroFactors()
const rotation = ...  // loadSectorRotation 결과
const predictions = useMlPredictions()

const themes = sectors?.[code]?.themes
const macroBonus = useMemo(() =>
  activeFactors.length > 0
    ? computeMacroBonus(stock.name, themes, activeFactors)
    : undefined,
  [stock.name, themes, activeFactors])
const sectorRotationBonus = useMemo(() =>
  rotation ? computeSectorRotationBonus(themes, rotation) : undefined,
  [themes, rotation])
const mlPrediction = predictions?.predictions[code]
const matchedPresetIds = useMemo(() => {
  const ids: string[] = []
  for (const p of allPresets) {
    if (p.filter({ stock, fundamental, params: {} })) ids.push(p.id)
  }
  return ids
}, [stock, fundamental])

// 3) 각 패널에 전달
<StockMomentumPanel
  stock={stock}
  ohlcvFull={ohlcvFull}
  fundamental={fundamental}
  macroBonus={macroBonus}
  sectorRotation={sectorRotationBonus}
  mlPrediction={mlPrediction}
  patternStats={patternStats?.by_stock_preset[code]}
  matchedPresetIds={matchedPresetIds}
/>

<MatchedPresets stock={stock} fundamental={fundamental} />
// MatchedPresets가 내부에서 다시 runPreset 돌지 않고 matchedPresetIds를 받도록 리팩토링
```

**리팩토링 범위**:
- `MatchedPresets.tsx`: 외부에서 `matchedIds` prop 받도록 수정 (optional, 없으면 내부 계산 — 하위 호환)
- `MacroDetailPanel.tsx`: `macroBonus` prop 외부 주입 허용 (optional)

---

## 🧩 판정 로직 (12개 집계 함수)

```typescript
// src/lib/stockMomentum/detectors.ts

interface DetectContext {
  stock: StockIndicators                        // 30일치 최근 지표
  ohlcvFull?: SingleStockOhlcv                  // 전체 5년치 (60일 신고가 등 계산용)
  fundamental?: Fundamental
  macroBonus?: MacroBonus                       // 상위(StockDetail)에서 한 번 계산해 전달
  sectorRotation?: SectorRotationBonus
  mlPrediction?: MLPrediction
  patternStats?: { [presetId: string]: PresetPatternStats }
  matchedPresetIds?: string[]                   // 상위에서 runPreset 결과로부터 추출
}

// 12개 detector
export function detectShortTermTrendChange(ctx: DetectContext): Signal | null
export function detectVolumeAnomaly(ctx: DetectContext): Signal | null
export function detectRsiRebound(ctx: DetectContext): Signal | null
export function detectNewHighBreak(ctx: DetectContext): Signal | null
export function detectBbLowerBounce(ctx: DetectContext): Signal | null
export function detectSupplyStrong(ctx: DetectContext): Signal | null
export function detectMacroBenefit(ctx: DetectContext): Signal | null
export function detectMlBullish(ctx: DetectContext): Signal | null
export function detectHistoricalWinner(ctx: DetectContext): Signal | null
export function detectBowlPhase3(ctx: DetectContext): Signal | null
export function detectOverheatedWarning(ctx: DetectContext): Signal | null
export function detectDownTrendWarning(ctx: DetectContext): Signal | null

// 각 detector는 내부에서 여러 sub-condition 체크 → 강도 계산
```

---

## 📂 파일 구조

```
src/
├── lib/
│   ├── bowl/
│   │   └── detectPhase.ts           [신규 — 공통 util (BowlPhaseIndicator 재사용)]
│   └── stockMomentum/
│       ├── types.ts                 [신규]
│       ├── detectors.ts             [신규, ~500줄]
│       ├── index.ts                 [신규, analyzeMomentum]
│       └── __tests__/
│           ├── detectors.test.ts    [12개 × 3 케이스 = ~36 테스트]
│           └── index.test.ts        [집계·정렬]
├── components/
│   └── stock/
│       ├── StockMomentumPanel.tsx   [신규]
│       └── BowlPhaseIndicator.tsx   [수정 — detectPhase util 사용]
├── app/[basePath]/stock/[code]/
│   └── StockDetail.tsx              [수정, 가격 아래 삽입 + matchedPresetIds 전달]
└── lib/strings/ko.ts                [수정, momentum 섹션]
```

**위치**: `<header>` (가격·이름) 바로 아래, 차트 위.

---

## 🧪 테스트

### 단위 (detectors)
각 detector에 대해:
1. 모든 sub-condition 충족 → ⭐⭐⭐ 반환
2. 일부 충족 → ⭐⭐ 또는 ⭐ 반환
3. 미충족 → null 반환
4. 필수 데이터 누락 → null (graceful)

12 detector × 3 = **36 테스트**.

### 집계
- 신호 0개 → bullishCount 0, signals 빈 배열
- 긍정 5 + 주의 1 → bullishCount 5, warningCount 1
- 정렬: 카테고리 순서 + 강도 내림차순

### UI (수동)
- 데스크톱 펼침
- 모바일 접힘 기본
- 빈 상태
- 주의만 있을 때
- "자세히 →" 링크 스크롤 동작
- 다크 모드

---

## ⚠️ 엣지 케이스

| 케이스 | 처리 |
|---|---|
| 모든 신호 0개 | 빈 상태 메시지 + 뉴스·공시 힌트 |
| ML 모델 미훈련 (predictions.json 없음) | ML 신호 null (스킵) — 다른 신호 정상 |
| 매크로 팩터 미활성 (macroBonus=0) | 섹터 로테이션만으로 ⭐ 가능 — 숨김 대신 |
| `foreign_net` 데이터 < 10일 | 수급 신호 null |
| pattern_stats에 매칭 프리셋 없음 | 과거 승률 신호 null |
| PER null (데이터 누락) | 과열 조건에서 PER 항만 제외 |
| RSI 3가지 조건 중 둘 이상 충족 불가 | 로직상 배타적 — 첫 충족(A>C>B) 반환 |
| 52주 고점 데이터 없음 (상장 1년 미만) | 신고가 돌파 신호 null |
| 주의 요인만 있음 (긍정 0) | 헤더 "주의 2개 · 긍정 0개" 강조 |
| 모바일 전부 접힘 상태 | 헤더에 "긍정 5 · 주의 1" 요약 |
| `ohlcvFull` 로드 실패 (네트워크 오류) | 60일 신고가·바닥 반등 등 full history 필요 신호 null. 30일 범위 신호는 정상 |
| `matchedPresetIds` 외부 미전달 | StockMomentumPanel 내부에서 fallback 계산 (하위 호환) |
| `linkAnchor` 대상 패널이 렌더 안 됨 (예: ML 없음) | 링크 클릭 시 무효. CSS로 링크 자체 표시 안 함 |

---

## 🚀 태스크 분해 (10 tasks)

### Phase 19A — 로직 (Tasks 1-4)
1. `types.ts` — 타입
2. `detectors.ts` 차트 5개 (추세·거래량·RSI·신고가·하단반등)
3. `detectors.ts` 나머지 5개 (수급·매크로·ML·과거·밥그릇)
4. `detectors.ts` 주의 2개 + `index.ts` 집계

### Phase 19B — 테스트 (Tasks 5-6)
5. `detectors.test.ts` — 12 × 3 = 36 테스트
6. `index.test.ts` — 집계·정렬

### Phase 19C — UI (Tasks 7-9)
7. `StockMomentumPanel.tsx` — 데스크톱·모바일
8. `ko.ts` momentum 섹션 (12 × 2 레이블·설명 + 공통 문자열)
9. `StockDetail.tsx` 통합 + 기존 패널 anchor 추가

### Phase 19D — QA + PR (Task 10)
10. 빌드·테스트·수동 QA 후 커밋·푸시·PR (**사용자 확인 후**)

**총 예상**: **1일**

---

## 🎯 설계 결정 근거

### 왜 12개인가?
- 너무 적으면(5~6) 정보 부족
- 너무 많으면(29) 과부하
- 12 = 한 화면에 보이면서 의미 있는 분류 가능

### 왜 강도 ⭐ 1~3인가?
- 모두 동일 ✓ 표시 시 우선순위 파악 불가
- 3단계가 가장 단순·직관적

### 왜 "자세히 →" 링크?
- 상세 정보 원하는 사용자 위해 기존 패널 유지
- 요약만 보는 사용자는 스크롤 불필요

### 왜 주의를 별도 섹션?
- 긍정·주의 섞으면 메시지 모호
- 하단에 배치해 "긍정 우선 + 주의 인지" 흐름

---

## ❓ 확정 전 확인

1. **12개 신호 구성** OK? (차트 5 / 수급 1 / 매크로 1 / ML 1 / 과거 1 / 밥그릇 1 / 주의 2)
2. **"오늘의 체크포인트" 제목** OK? 다른 제안 있으면 수용
3. **강도 ⭐ 1~3** 표시 방식 OK?
4. **모바일 기본 접힘** OK? (펼쳐놓으면 차트 밀림)

확정 시 plan 문서 작성 → 새 브랜치 생성 → 구현.
