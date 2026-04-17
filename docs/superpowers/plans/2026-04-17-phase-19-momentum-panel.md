# Phase 19 — 종목 상세 "오늘의 체크포인트" 패널 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 종목 상세 페이지 가격 바로 아래에 12개 신호 기반 "오늘의 체크포인트" 패널 추가. Phase 13~18 데이터를 통합 활용해 상승·주의 신호를 강도 ⭐(1~3) + 시점 라벨과 함께 요약 표시.

**Architecture:** `src/lib/stockMomentum/`에 타입·판정 로직·집계 배치. 12개 detector 함수 각각 하나의 Signal 반환(null 가능). `StockDetail`에서 공통 계산(macroBonus·matchedPresetIds) 후 props 전달. 기존 패널에 anchor ID 부여해 "자세히 →" in-page 링크.

**Tech Stack:** TypeScript, Next.js 14, Tailwind, Vitest + @testing-library/react.

**Design Spec:** [`docs/superpowers/specs/2026-04-17-phase-19-stock-momentum-panel-design.md`](../specs/2026-04-17-phase-19-stock-momentum-panel-design.md)

---

## 사전 준비

- 현재 브랜치: `feature/phase-19-momentum-panel` (이미 생성·푸시)
- 프로젝트 루트: `/c/Users/rk454/Desktop/Project/Money/MoneyProject`
- Bash 절대 경로 사용
- Phase 13~18 인프라 재사용: `useMacroFactors`, `useSectorRotation`, `useMlPredictions`, `loadPatternStats`, bowl·macro·ml 타입
- **`fix/recommend-filter-negative` PR 머지 전**에 작업 가능 (주요 의존 없음). 머지 후 rebase 가능.

---

## Phase 19A — 로직 (Tasks 1-4)

### Task 1: 타입 정의 + bowl detectPhase util 추출

**Files:**
- Create: `src/lib/stockMomentum/types.ts`
- Create: `src/lib/bowl/detectPhase.ts`

- [ ] **Step 1: stockMomentum/types.ts 구현**

```typescript
// src/lib/stockMomentum/types.ts
import type { StockIndicators, Fundamental, PresetPatternStats, MLPrediction } from '@/lib/types/indicators'
import type { MacroBonus } from '@/lib/macro/types'
import type { SectorRotationBonus } from '@/lib/macro/sectorRotation'
import type { SingleStockOhlcv } from '@/lib/dataLoader'

export type SignalCategory =
  | 'chart' | 'supply' | 'macro' | 'ml' | 'historical' | 'bowl' | 'warning'

export type SignalTone = 'bullish' | 'warning'

/** 신호 발생 시점 */
export type SignalTiming = 'latest' | 'recent' | 'ongoing'

export interface Signal {
  id: string
  category: SignalCategory
  tone: SignalTone
  strength: 1 | 2 | 3
  timing: SignalTiming
  label: string
  description: string
  detail?: string
  linkAnchor?: string
}

export interface MomentumAnalysis {
  signals: Signal[]
  bullishCount: number
  warningCount: number
}

export interface DetectContext {
  stock: StockIndicators
  ohlcvFull?: SingleStockOhlcv
  fundamental?: Fundamental
  macroBonus?: MacroBonus
  sectorRotation?: SectorRotationBonus
  mlPrediction?: MLPrediction
  patternStats?: { [presetId: string]: PresetPatternStats }
  matchedPresetIds?: string[]
}

export const PANEL_ANCHORS = {
  matchedPresets:  'matched-presets',
  bowlPhase:       'bowl-phase',
  bowlVolume:      'bowl-volume',
  macroDetail:     'macro-detail',
  mlPrediction:    'ml-prediction'
} as const
```

- [ ] **Step 2: bowl/detectPhase.ts 구현**

```typescript
// src/lib/bowl/detectPhase.ts
import type { StockIndicators } from '@/lib/types/indicators'

export type BowlPhase = 1 | 2 | 3 | 4 | null

/**
 * 밥그릇 4단계 중 현재 위치 판정.
 * BowlPhaseIndicator와 StockMomentumPanel에서 공유.
 */
export function detectBowlPhase(stock: StockIndicators): BowlPhase {
  if (stock.bowl_low_90d == null || stock.bowl_days_since_low == null) return null
  if (stock.bowl_low_was_inverted !== true) return null

  if (stock.bowl_current_aligned === true && stock.bowl_has_recent_golden_cross === true) {
    return 4
  }
  if (stock.bowl_has_recent_golden_cross === true) {
    return 3
  }
  if (stock.bowl_days_since_low >= 10) {
    return 2
  }
  return 1
}
```

- [ ] **Step 3: BowlPhaseIndicator 리팩토링 — 새 util 사용**

`src/components/stock/BowlPhaseIndicator.tsx`의 기존 `detectPhase()` 제거하고 import:
```typescript
import { detectBowlPhase } from '@/lib/bowl/detectPhase'
// ...
const phase = detectBowlPhase(stock)
```
기존 함수 선언 삭제. 함수 시그니처 동일하므로 호출부 그대로 유지.

- [ ] **Step 4: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`
Expected: 에러 없음

---

### Task 2: 차트 카테고리 5개 detector

**Files:**
- Create: `src/lib/stockMomentum/detectors.ts` (차트 5개 먼저)

- [ ] **Step 1: 공통 helper + 차트 신호 5개**

```typescript
// src/lib/stockMomentum/detectors.ts
import type { Signal, DetectContext } from './types'
import { PANEL_ANCHORS } from './types'

// ----- helpers -----
function last<T>(arr: readonly T[] | undefined | null, offset: number = 0): T | undefined {
  if (!arr || arr.length === 0) return undefined
  const idx = arr.length - 1 - offset
  if (idx < 0) return undefined
  return arr[idx]
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function crossedUp(seriesA: readonly (number | null)[], seriesB: readonly (number | null)[], withinDays: number): { crossed: boolean; daysAgo: number | null } {
  for (let offset = 0; offset < withinDays; offset++) {
    const aT = last(seriesA, offset)
    const aY = last(seriesA, offset + 1)
    const bT = last(seriesB, offset)
    const bY = last(seriesB, offset + 1)
    if (!isNum(aT) || !isNum(aY) || !isNum(bT) || !isNum(bY)) continue
    if (aT > bT && aY <= bY) return { crossed: true, daysAgo: offset }
  }
  return { crossed: false, daysAgo: null }
}

// ----- #1. 단기 추세 전환 -----
export function detectShortTermTrendChange(ctx: DetectContext): Signal | null {
  const { stock } = ctx
  const conditions: string[] = []
  let minDaysAgo = 99

  // a. MA20 > MA60 상향 돌파 (최근 3일)
  const gc = crossedUp(stock.ma20, stock.ma60, 3)
  if (gc.crossed) {
    conditions.push('MA20↑MA60')
    if (gc.daysAgo! < minDaysAgo) minDaysAgo = gc.daysAgo!
  }

  // b. MACD 라인 > 시그널 상향 돌파 (최근 3일)
  const mc = crossedUp(stock.macd_line, stock.macd_signal, 3)
  if (mc.crossed) {
    conditions.push('MACD↑시그널')
    if (mc.daysAgo! < minDaysAgo) minDaysAgo = mc.daysAgo!
  }

  // c. MACD 히스토그램 음→양 (최근 3일)
  for (let offset = 0; offset < 3; offset++) {
    const hT = last(stock.macd_hist, offset)
    const hY = last(stock.macd_hist, offset + 1)
    if (!isNum(hT) || !isNum(hY)) continue
    if (hY <= 0 && hT > 0) {
      conditions.push('MACD히스토 양전환')
      if (offset < minDaysAgo) minDaysAgo = offset
      break
    }
  }

  // d. MA5 > MA20 > MA60 (MA120 미만 or 없음)
  const m5 = last(stock.ma5)
  const m20 = last(stock.ma20)
  const m60 = last(stock.ma60)
  const m120 = last(stock.ma120)
  if (isNum(m5) && isNum(m20) && isNum(m60) && m5 > m20 && m20 > m60) {
    if (!isNum(m120) || m120 >= m60) {
      conditions.push('단기 정배열')
    }
  }

  if (conditions.length === 0) return null
  const strength: 1 | 2 | 3 = conditions.length >= 3 ? 3 : conditions.length === 2 ? 2 : 1
  const timing = minDaysAgo === 0 ? 'latest' : (minDaysAgo <= 3 ? 'recent' : 'ongoing')
  return {
    id: 'short_term_trend_change',
    category: 'chart',
    tone: 'bullish',
    strength,
    timing,
    label: '단기 추세 전환',
    description: 'MA·MACD 상승 전환 신호',
    detail: conditions.join(' · '),
    linkAnchor: PANEL_ANCHORS.matchedPresets
  }
}

// ----- #2. 거래량 이상 -----
export function detectVolumeAnomaly(ctx: DetectContext): Signal | null {
  const { stock } = ctx
  const vol = stock.volume
  const volAvg20 = stock.vol_avg20
  const close = stock.close
  const open = stock.open
  if (!vol || vol.length < 21 || !close || close.length < 21) return null

  const conditions: string[] = []

  // 오늘 거래량 ≥ 20일 평균 × 1.5 & 양봉
  const today = vol[vol.length - 1]
  const yestClose = close[close.length - 2]
  const todayClose = close[close.length - 1]
  const todayOpen = open ? open[open.length - 1] : undefined
  const isBull = isNum(todayOpen) ? todayClose > todayOpen : todayClose > yestClose
  if (isNum(today) && isNum(volAvg20) && volAvg20 > 0 && today >= volAvg20 * 1.5 && isBull) {
    const ratio = today / volAvg20
    conditions.push(`급증 (${ratio.toFixed(1)}배)`)
  }

  // 최근 10일 평균 > 이전 10일 평균 × 1.3
  if (vol.length >= 21) {
    const recent = vol.slice(-10).reduce((a, b) => a + (b ?? 0), 0) / 10
    const prev = vol.slice(-20, -10).reduce((a, b) => a + (b ?? 0), 0) / 10
    if (prev > 0 && recent > prev * 1.3) {
      conditions.push('추세적 증가')
    }
  }

  if (conditions.length === 0) return null
  const strength: 1 | 2 | 3 = conditions.length === 2 ? 2 : 1
  return {
    id: 'volume_anomaly',
    category: 'chart',
    tone: 'bullish',
    strength,
    timing: 'latest',
    label: '거래량 이상',
    description: '매수세 유입',
    detail: conditions.join(' · '),
    linkAnchor: PANEL_ANCHORS.bowlVolume
  }
}

// ----- #3. RSI 구간 양호 -----
export function detectRsiRebound(ctx: DetectContext): Signal | null {
  const { stock } = ctx
  const rsi = stock.rsi14
  if (!rsi || rsi.length < 6) return null
  const today = rsi[rsi.length - 1]
  const yest = rsi[rsi.length - 2]
  const back5 = rsi[rsi.length - 6]
  if (!isNum(today)) return null

  // A. 과매도 이탈 (가장 강력)
  if (isNum(yest) && yest < 30 && today >= 30) {
    return {
      id: 'rsi_rebound',
      category: 'chart',
      tone: 'bullish',
      strength: 2,
      timing: 'latest',
      label: 'RSI 과매도 이탈',
      description: '반등 초입 구간',
      detail: `어제 ${yest.toFixed(0)} → 오늘 ${today.toFixed(0)}`,
      linkAnchor: PANEL_ANCHORS.matchedPresets
    }
  }

  // C. 건강한 모멘텀 (50~70)
  if (today >= 50 && today <= 70 && isNum(back5) && today > back5) {
    return {
      id: 'rsi_rebound',
      category: 'chart',
      tone: 'bullish',
      strength: 1,
      timing: 'ongoing',
      label: 'RSI 건강한 모멘텀',
      description: '50~70 구간 상승 중',
      detail: `RSI ${today.toFixed(0)}`,
      linkAnchor: PANEL_ANCHORS.matchedPresets
    }
  }

  // B. 과매도 회복 (30~50)
  if (today > 30 && today < 50 && isNum(back5) && today > back5) {
    return {
      id: 'rsi_rebound',
      category: 'chart',
      tone: 'bullish',
      strength: 1,
      timing: 'recent',
      label: 'RSI 과매도 회복',
      description: '30~50 구간 상승 중',
      detail: `RSI ${today.toFixed(0)}`,
      linkAnchor: PANEL_ANCHORS.matchedPresets
    }
  }

  return null
}

// ----- #4. 신고가 돌파 -----
export function detectNewHighBreak(ctx: DetectContext): Signal | null {
  const { stock, ohlcvFull } = ctx
  const close = stock.close
  if (!close || close.length < 2) return null
  const today = close[close.length - 1]
  const yest = close[close.length - 2]
  if (!isNum(today) || !isNum(yest)) return null

  // 52주 고점 — indicators.json의 단일 값 사용
  const high52w = stock.high52w
  const has52w = stock.has_52w
  const broke52w = has52w && isNum(high52w) && yest < high52w && today >= high52w
  const near52w = has52w && isNum(high52w) && today >= high52w * 0.995

  // 60일 고점 — ohlcvFull 필요 (indicators.json close는 30일)
  let broke60d = false
  if (ohlcvFull && ohlcvFull.close && ohlcvFull.close.length >= 61) {
    const fullCloses = ohlcvFull.close
    const tIdx = fullCloses.length - 1
    const high60 = Math.max(...fullCloses.slice(tIdx - 60, tIdx))
    const yestFull = fullCloses[tIdx - 1]
    if (isNum(yestFull) && yestFull < high60 && fullCloses[tIdx] >= high60) {
      broke60d = true
    }
  }

  if (!broke52w && !near52w && !broke60d) return null

  let strength: 1 | 2 | 3 = 1
  let label = ''
  if (broke52w) {
    strength = 3
    label = '52주 신고가 돌파'
  } else if (near52w && broke60d) {
    strength = 2
    label = '52주 근접 + 60일 돌파'
  } else if (near52w) {
    strength = 1
    label = '52주 고점 근접'
  } else {
    strength = 1
    label = '60일 신고가 돌파'
  }

  return {
    id: 'new_high_break',
    category: 'chart',
    tone: 'bullish',
    strength,
    timing: 'latest',
    label,
    description: '강한 추세 — 장기 저항 돌파',
    linkAnchor: PANEL_ANCHORS.matchedPresets
  }
}

// ----- #5. 바닥 터치 반등 -----
export function detectBbLowerBounce(ctx: DetectContext): Signal | null {
  const { stock } = ctx
  const close = stock.close
  const bbLower = stock.bb_lower
  if (!close || !bbLower || close.length < 5) return null
  const today = close[close.length - 1]
  const yest = close[close.length - 2]
  if (!isNum(today) || !isNum(yest)) return null
  if (today <= yest) return null // 반등 아님

  // 최근 5일 중 하단 터치 횟수
  let touches = 0
  let consecutive = 0
  let maxConsecutive = 0
  for (let i = 0; i < 5; i++) {
    const c = close[close.length - 1 - i]
    const bbl = bbLower[bbLower.length - 1 - i]
    if (isNum(c) && isNum(bbl) && c <= bbl) {
      touches++
      consecutive++
      if (consecutive > maxConsecutive) maxConsecutive = consecutive
    } else {
      consecutive = 0
    }
  }

  if (touches === 0) return null
  const strength: 1 | 2 | 3 = touches >= 2 || maxConsecutive >= 3 ? 3 : 2
  return {
    id: 'bb_lower_bounce',
    category: 'chart',
    tone: 'bullish',
    strength,
    timing: 'latest',
    label: '바닥 터치 반등',
    description: '볼린저 하단 반등',
    detail: `최근 5일 중 ${touches}회 터치`,
    linkAnchor: PANEL_ANCHORS.matchedPresets
  }
}
```

- [ ] **Step 2: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`
Expected: 에러 없음

---

### Task 3: 나머지 5개 detector (수급·매크로·ML·과거·밥그릇)

**Files:**
- Modify: `src/lib/stockMomentum/detectors.ts` (5개 추가)

- [ ] **Step 1: 추가 구현 (Task 2 파일 끝에 append)**

```typescript
// ----- #6. 수급 강세 -----
export function detectSupplyStrong(ctx: DetectContext): Signal | null {
  const { fundamental } = ctx
  if (!fundamental) return null
  const fn = fundamental.foreign_net
  const in_ = fundamental.institution_net

  const foreignStreak = fn && fn.length >= 10
    ? fn.slice(-10).filter((v) => v > 0).length >= 7
    : false
  const institutionStreak = in_ && in_.length >= 10
    ? in_.slice(-10).filter((v) => v > 0).length >= 7
    : false

  const todayForeign = fn ? fn[fn.length - 1] : undefined
  const maxRecent = fn && fn.length >= 10 ? Math.max(...fn.slice(-10)) : undefined
  const todayIsMax = isNum(todayForeign) && isNum(maxRecent) && todayForeign === maxRecent && todayForeign > 0

  if (!foreignStreak && !institutionStreak) return null

  let strength: 1 | 2 | 3 = 1
  const parts: string[] = []
  if (foreignStreak && institutionStreak) {
    strength = 3
    parts.push('외국인·기관 동시')
  } else if ((foreignStreak || institutionStreak) && todayIsMax) {
    strength = 2
    parts.push(foreignStreak ? '외국인 지속' : '기관 지속')
    parts.push('오늘 최대 매집')
  } else {
    parts.push(foreignStreak ? '외국인 지속' : '기관 지속')
  }

  return {
    id: 'supply_strong',
    category: 'supply',
    tone: 'bullish',
    strength,
    timing: 'ongoing',
    label: '수급 강세',
    description: parts.join(' · '),
    detail: '10일 중 7일 이상 순매수',
    linkAnchor: PANEL_ANCHORS.matchedPresets
  }
}

// ----- #7. 매크로 환경 수혜 -----
export function detectMacroBenefit(ctx: DetectContext): Signal | null {
  const total = ctx.macroBonus?.total ?? 0
  const rotDelta = ctx.sectorRotation?.sectorRotationDelta ?? 0
  const isSectorStrong = rotDelta > 0
  if (total <= 0 && !isSectorStrong) return null

  let strength: 1 | 2 | 3 = 1
  const parts: string[] = []
  if (total + rotDelta >= 15 && total > 0 && isSectorStrong) {
    strength = 3
    parts.push(`팩터 +${total}`, `섹터 +${rotDelta}`)
  } else if (total >= 6 || (total > 0 && isSectorStrong)) {
    strength = 2
    if (total > 0) parts.push(`팩터 +${total}`)
    if (isSectorStrong) parts.push(`섹터 +${rotDelta}`)
  } else {
    if (total > 0) parts.push(`팩터 +${total}`)
    if (isSectorStrong) parts.push(`섹터 +${rotDelta}`)
  }

  return {
    id: 'macro_benefit',
    category: 'macro',
    tone: 'bullish',
    strength,
    timing: 'ongoing',
    label: '매크로 환경 수혜',
    description: '시장 환경·섹터가 유리',
    detail: parts.join(' · '),
    linkAnchor: PANEL_ANCHORS.macroDetail
  }
}

// ----- #8. ML 예측 긍정 -----
export function detectMlBullish(ctx: DetectContext): Signal | null {
  const p = ctx.mlPrediction
  if (!p) return null
  const prob = p.probability
  if (prob < 0.6) return null

  const strength: 1 | 2 | 3 = prob >= 0.85 ? 3 : prob >= 0.7 ? 2 : 1
  return {
    id: 'ml_bullish',
    category: 'ml',
    tone: 'bullish',
    strength,
    timing: 'latest',
    label: 'ML 예측 긍정',
    description: `D+20 초과수익 확률 ${Math.round(prob * 100)}%`,
    detail: `+${p.ml_score}점 기대`,
    linkAnchor: PANEL_ANCHORS.mlPrediction
  }
}

// ----- #9. 과거 승률 양호 -----
export function detectHistoricalWinner(ctx: DetectContext): Signal | null {
  const { patternStats, matchedPresetIds } = ctx
  if (!patternStats || !matchedPresetIds || matchedPresetIds.length === 0) return null
  let sumWin = 0
  let sumAvg = 0
  let totalSamples = 0
  let count = 0
  for (const pid of matchedPresetIds) {
    const s = patternStats[pid]
    if (!s || s.sample_count < 5) continue
    const h = s.d14 ?? s.d7
    if (!h) continue
    sumWin += h.win_rate
    sumAvg += h.avg
    totalSamples += s.sample_count
    count++
  }
  if (count === 0) return null
  const avgWin = sumWin / count
  const avgReturn = sumAvg / count
  if (avgWin < 60) return null

  const strength: 1 | 2 | 3 = avgWin >= 80 ? 3 : avgWin >= 70 ? 2 : 1
  return {
    id: 'historical_winner',
    category: 'historical',
    tone: 'bullish',
    strength,
    timing: 'ongoing',
    label: '과거 승률 양호',
    description: `매칭 신호 승률 ${Math.round(avgWin)}% · 평균 ${avgReturn > 0 ? '+' : ''}${avgReturn.toFixed(2)}%`,
    detail: `과거 총 ${totalSamples}건`
  }
}

// ----- #10. 밥그릇 공이 구간 -----
import { detectBowlPhase } from '@/lib/bowl/detectPhase'

export function detectBowlPhase3(ctx: DetectContext): Signal | null {
  const { stock } = ctx
  const phase = detectBowlPhase(stock)
  if (phase !== 3) return null

  const volScore = stock.bowl_volume_score ?? 0
  const hasGC = stock.bowl_has_recent_golden_cross === true
  let strength: 1 | 2 | 3 = 1
  if (volScore >= 70 && hasGC) strength = 3
  else if (volScore >= 70) strength = 2

  return {
    id: 'bowl_phase_3',
    category: 'bowl',
    tone: 'bullish',
    strength,
    timing: 'ongoing',
    label: '밥그릇 공이 구간',
    description: '역배열→정배열 변곡점',
    detail: `거래량 점수 ${volScore}`,
    linkAnchor: PANEL_ANCHORS.bowlPhase
  }
}
```

- [ ] **Step 2: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`

---

### Task 4: 주의 카테고리 2개 + 집계 함수

**Files:**
- Modify: `src/lib/stockMomentum/detectors.ts` (2개 추가)
- Create: `src/lib/stockMomentum/index.ts`

- [ ] **Step 1: 주의 2개 추가 (detectors.ts 끝에 append)**

```typescript
// ----- #11. 과열·고점 근접 (주의) -----
export function detectOverheatedWarning(ctx: DetectContext): Signal | null {
  const { stock, fundamental } = ctx
  const rsi = last(stock.rsi14)
  const close = last(stock.close)
  const high52w = stock.high52w
  const per = fundamental?.per ?? null

  let count = 0
  const parts: string[] = []
  if (isNum(rsi) && rsi > 70) {
    count++
    parts.push(`RSI ${rsi.toFixed(0)}`)
  }
  if (isNum(close) && isNum(high52w) && stock.has_52w && close >= high52w * 0.95) {
    count++
    parts.push('52주 고점 근접')
  }
  if (isNum(per) && per > 50) {
    count++
    parts.push(`PER ${per.toFixed(0)}`)
  }

  if (count === 0) return null
  const strength: 1 | 2 | 3 = count >= 3 ? 3 : count === 2 ? 2 : 1
  return {
    id: 'overheated_warning',
    category: 'warning',
    tone: 'warning',
    strength,
    timing: 'latest',
    label: '과열·고점 근접',
    description: '단기 조정 가능',
    detail: parts.join(' · ')
  }
}

// ----- #12. 하락 추세 (주의) -----
export function detectDownTrendWarning(ctx: DetectContext): Signal | null {
  const { stock } = ctx
  const m5 = last(stock.ma5)
  const m20 = last(stock.ma20)
  const m60 = last(stock.ma60)
  const m120 = last(stock.ma120)

  let count = 0
  const parts: string[] = []
  if (isNum(m5) && isNum(m20) && isNum(m60) && isNum(m120) && m5 < m20 && m20 < m60 && m60 < m120) {
    count++
    parts.push('역배열')
  }

  const vol = stock.volume
  if (vol && vol.length >= 21) {
    const recent5 = vol.slice(-5).reduce((a, b) => a + (b ?? 0), 0) / 5
    const avg20 = stock.vol_avg20
    if (isNum(avg20) && avg20 > 0 && recent5 <= avg20 * 0.7) {
      count++
      parts.push('거래량 이탈')
    }
  }

  if (count === 0) return null
  const strength: 1 | 2 | 3 = count >= 2 ? 2 : 1
  return {
    id: 'down_trend_warning',
    category: 'warning',
    tone: 'warning',
    strength: Math.min(strength, 3) as 1 | 2 | 3,
    timing: 'ongoing',
    label: '하락 추세',
    description: '전반적 흐름 하향',
    detail: parts.join(' · ')
  }
}
```

- [ ] **Step 2: index.ts — 집계 함수**

```typescript
// src/lib/stockMomentum/index.ts
import type { DetectContext, Signal, MomentumAnalysis, SignalCategory } from './types'
import {
  detectShortTermTrendChange,
  detectVolumeAnomaly,
  detectRsiRebound,
  detectNewHighBreak,
  detectBbLowerBounce,
  detectSupplyStrong,
  detectMacroBenefit,
  detectMlBullish,
  detectHistoricalWinner,
  detectBowlPhase3,
  detectOverheatedWarning,
  detectDownTrendWarning
} from './detectors'

export * from './types'

const DETECTORS = [
  detectShortTermTrendChange,
  detectVolumeAnomaly,
  detectRsiRebound,
  detectNewHighBreak,
  detectBbLowerBounce,
  detectSupplyStrong,
  detectMacroBenefit,
  detectMlBullish,
  detectHistoricalWinner,
  detectBowlPhase3,
  detectOverheatedWarning,
  detectDownTrendWarning
]

const CATEGORY_ORDER: SignalCategory[] = [
  'chart', 'supply', 'macro', 'ml', 'historical', 'bowl', 'warning'
]

export function analyzeMomentum(ctx: DetectContext): MomentumAnalysis {
  const signals: Signal[] = []
  for (const fn of DETECTORS) {
    try {
      const s = fn(ctx)
      if (s) signals.push(s)
    } catch {
      // detector 개별 에러는 스킵
    }
  }

  // 카테고리 순서 + 카테고리 내 강도 내림차순 정렬
  signals.sort((a, b) => {
    const catDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
    if (catDiff !== 0) return catDiff
    return b.strength - a.strength
  })

  const bullishCount = signals.filter((s) => s.tone === 'bullish').length
  const warningCount = signals.filter((s) => s.tone === 'warning').length
  return { signals, bullishCount, warningCount }
}
```

- [ ] **Step 3: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`
Expected: 에러 없음

---

## Phase 19B — 테스트 (Tasks 5-6)

### Task 5: detectors 단위 테스트

**Files:**
- Create: `src/lib/stockMomentum/__tests__/detectors.test.ts`

- [ ] **Step 1: 구현 (기본 3 케이스 per detector)**

```typescript
// src/lib/stockMomentum/__tests__/detectors.test.ts
import { describe, it, expect } from 'vitest'
import {
  detectShortTermTrendChange,
  detectVolumeAnomaly,
  detectRsiRebound,
  detectNewHighBreak,
  detectBbLowerBounce,
  detectSupplyStrong,
  detectMacroBenefit,
  detectMlBullish,
  detectHistoricalWinner,
  detectBowlPhase3,
  detectOverheatedWarning,
  detectDownTrendWarning
} from '../detectors'
import type { DetectContext } from '../types'
import type { StockIndicators } from '@/lib/types/indicators'

function mkStock(overrides: Partial<StockIndicators> = {}): StockIndicators {
  return {
    name: 'T', market: 'KOSPI',
    dates: Array.from({ length: 30 }, (_, i) => `2026-04-${String(i + 1).padStart(2, '0')}`),
    close: Array(30).fill(1000),
    volume: Array(30).fill(1000),
    open: Array(30).fill(1000),
    high: Array(30).fill(1000),
    low: Array(30).fill(1000),
    ma5: Array(30).fill(1000),
    ma20: Array(30).fill(1000),
    ma60: Array(30).fill(1000),
    ma120: Array(30).fill(1000),
    rsi14: Array(30).fill(50),
    macd_line: Array(30).fill(0),
    macd_signal: Array(30).fill(0),
    macd_hist: Array(30).fill(0),
    bb_upper: Array(30).fill(1100),
    bb_middle: Array(30).fill(1000),
    bb_lower: Array(30).fill(900),
    high52w: 1200,
    has_52w: true,
    vol_avg20: 1000,
    ...overrides
  }
}

function ctx(partial: Partial<DetectContext> = {}): DetectContext {
  return { stock: mkStock(), ...partial }
}

describe('detectShortTermTrendChange', () => {
  it('returns null when no conditions met', () => {
    expect(detectShortTermTrendChange(ctx())).toBeNull()
  })
  it('detects golden cross within 3 days', () => {
    const ma20 = Array(30).fill(100)
    const ma60 = Array(30).fill(100)
    ma60[28] = 101; ma20[28] = 99
    ma60[29] = 99; ma20[29] = 101  // today: 20 > 60, yesterday: 20 < 60
    const s = detectShortTermTrendChange(ctx({ stock: mkStock({ ma20, ma60 }) }))
    expect(s).not.toBeNull()
    expect(s!.strength).toBeGreaterThanOrEqual(1)
  })
  it('detects 3+ conditions as strength 3', () => {
    const stock = mkStock({
      ma20: Array(30).fill(100).map((v, i) => i === 28 ? 99 : i === 29 ? 101 : v),
      ma60: Array(30).fill(100).map((v, i) => i === 28 ? 101 : i === 29 ? 99 : v),
      macd_line: Array(30).fill(0).map((v, i) => i === 28 ? -1 : i === 29 ? 1 : v),
      macd_signal: Array(30).fill(0).map((v, i) => i === 28 ? 0 : i === 29 ? 0 : v),
      macd_hist: Array(30).fill(0).map((v, i) => i === 28 ? -1 : i === 29 ? 1 : v)
    })
    const s = detectShortTermTrendChange(ctx({ stock }))
    expect(s).not.toBeNull()
    expect(s!.strength).toBe(3)
  })
})

describe('detectVolumeAnomaly', () => {
  it('returns null for normal volume', () => {
    expect(detectVolumeAnomaly(ctx())).toBeNull()
  })
  it('detects spike with bull candle', () => {
    const volume = Array(30).fill(1000)
    volume[29] = 2000  // 2x vol_avg20=1000
    const close = Array(30).fill(1000)
    close[29] = 1050  // bull candle
    const s = detectVolumeAnomaly(ctx({ stock: mkStock({ volume, close, vol_avg20: 1000 }) }))
    expect(s).not.toBeNull()
  })
})

describe('detectRsiRebound', () => {
  it('returns null when no rebound', () => {
    expect(detectRsiRebound(ctx())).toBeNull()
  })
  it('detects oversold exit (A) with strength 2', () => {
    const rsi14 = Array(30).fill(50)
    rsi14[28] = 28; rsi14[29] = 32
    const s = detectRsiRebound(ctx({ stock: mkStock({ rsi14 }) }))
    expect(s).not.toBeNull()
    expect(s!.strength).toBe(2)
    expect(s!.label).toContain('과매도 이탈')
  })
  it('detects healthy momentum (C) with strength 1', () => {
    const rsi14 = Array(30).fill(55)
    rsi14[29] = 60
    const s = detectRsiRebound(ctx({ stock: mkStock({ rsi14 }) }))
    expect(s).not.toBeNull()
    expect(s!.strength).toBe(1)
  })
})

describe('detectNewHighBreak', () => {
  it('returns null when not near high', () => {
    expect(detectNewHighBreak(ctx())).toBeNull()
  })
  it('detects 52w break with strength 3', () => {
    const close = Array(30).fill(1000)
    close[28] = 1150
    close[29] = 1200
    const s = detectNewHighBreak(ctx({ stock: mkStock({ close, high52w: 1200, has_52w: true }) }))
    expect(s).not.toBeNull()
    expect(s!.strength).toBe(3)
  })
})

describe('detectBbLowerBounce', () => {
  it('returns null if no touch', () => {
    expect(detectBbLowerBounce(ctx())).toBeNull()
  })
  it('detects single touch bounce with strength 2', () => {
    const close = Array(30).fill(1000)
    const bb_lower = Array(30).fill(900)
    close[28] = 890  // touch
    close[29] = 910  // bounce
    const s = detectBbLowerBounce(ctx({ stock: mkStock({ close, bb_lower }) }))
    expect(s).not.toBeNull()
    expect(s!.strength).toBe(2)
  })
})

describe('detectSupplyStrong', () => {
  it('returns null without fundamental', () => {
    expect(detectSupplyStrong(ctx())).toBeNull()
  })
  it('detects foreign streak with strength 1', () => {
    const s = detectSupplyStrong(ctx({
      fundamental: {
        pbr: null, per: null, market_cap: 1e9,
        foreign_net: [1, 1, 1, 1, 1, 1, 1, -1, -1, -1],  // 7 positive = exactly 7
        institution_net: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
      }
    }))
    // slice(-10).filter > 0: [1,1,1,1,1,1,1,-1,-1,-1] has 7 positives → streak true
    expect(s).not.toBeNull()
  })
  it('detects both streak with strength 3', () => {
    const ones = Array(10).fill(1)
    const s = detectSupplyStrong(ctx({
      fundamental: { pbr: null, per: null, market_cap: 1e9, foreign_net: ones, institution_net: ones }
    }))
    expect(s).not.toBeNull()
    expect(s!.strength).toBe(3)
  })
})

describe('detectMacroBenefit', () => {
  it('returns null when nothing', () => {
    expect(detectMacroBenefit(ctx())).toBeNull()
  })
  it('detects with sector only', () => {
    const s = detectMacroBenefit(ctx({
      macroBonus: { total: 0, detail: [] },
      sectorRotation: { sectorRotationDelta: 3, activeSector: '반도체', rank: 'strong' }
    }))
    expect(s).not.toBeNull()
    expect(s!.strength).toBe(1)
  })
  it('detects strength 3 when factor+sector sum ≥ 15', () => {
    const s = detectMacroBenefit(ctx({
      macroBonus: { total: 12, detail: [] },
      sectorRotation: { sectorRotationDelta: 3, activeSector: '반도체', rank: 'strong' }
    }))
    expect(s).not.toBeNull()
    expect(s!.strength).toBe(3)
  })
})

describe('detectMlBullish', () => {
  it('returns null without ML', () => {
    expect(detectMlBullish(ctx())).toBeNull()
  })
  it('returns null below 0.6', () => {
    const s = detectMlBullish(ctx({ mlPrediction: { probability: 0.5, ml_score: 5, top_features: [] } }))
    expect(s).toBeNull()
  })
  it('strength 3 at 0.85+', () => {
    const s = detectMlBullish(ctx({ mlPrediction: { probability: 0.9, ml_score: 20, top_features: [] } }))
    expect(s!.strength).toBe(3)
  })
})

describe('detectHistoricalWinner', () => {
  it('returns null without stats', () => {
    expect(detectHistoricalWinner(ctx())).toBeNull()
  })
  it('returns null when win rate < 60', () => {
    const s = detectHistoricalWinner(ctx({
      patternStats: { foo: { sample_count: 10, d1: { avg: 0, max: 0, win_rate: 0 }, d3: { avg: 0, max: 0, win_rate: 0 }, d7: { avg: 1, max: 0, win_rate: 50 } } },
      matchedPresetIds: ['foo']
    }))
    expect(s).toBeNull()
  })
  it('strength 2 at 70~80 win rate', () => {
    const s = detectHistoricalWinner(ctx({
      patternStats: { foo: { sample_count: 10, d1: { avg: 0, max: 0, win_rate: 0 }, d3: { avg: 0, max: 0, win_rate: 0 }, d7: { avg: 2, max: 0, win_rate: 75 } } },
      matchedPresetIds: ['foo']
    }))
    expect(s!.strength).toBe(2)
  })
})

describe('detectBowlPhase3', () => {
  it('returns null when not phase 3', () => {
    expect(detectBowlPhase3(ctx())).toBeNull()
  })
  it('detects phase 3', () => {
    const s = detectBowlPhase3(ctx({
      stock: mkStock({
        bowl_low_90d: 900, bowl_days_since_low: 20,
        bowl_low_was_inverted: true,
        bowl_has_recent_golden_cross: true,
        bowl_current_aligned: false,
        bowl_volume_score: 60
      })
    }))
    expect(s).not.toBeNull()
    expect(s!.strength).toBe(1)
  })
  it('strength 3 with volume score + GC', () => {
    const s = detectBowlPhase3(ctx({
      stock: mkStock({
        bowl_low_90d: 900, bowl_days_since_low: 20,
        bowl_low_was_inverted: true,
        bowl_has_recent_golden_cross: true,
        bowl_current_aligned: false,
        bowl_volume_score: 80
      })
    }))
    expect(s!.strength).toBe(3)
  })
})

describe('detectOverheatedWarning', () => {
  it('returns null when normal', () => {
    expect(detectOverheatedWarning(ctx())).toBeNull()
  })
  it('detects RSI > 70', () => {
    const rsi14 = Array(30).fill(50); rsi14[29] = 75
    const s = detectOverheatedWarning(ctx({ stock: mkStock({ rsi14 }) }))
    expect(s).not.toBeNull()
    expect(s!.tone).toBe('warning')
  })
})

describe('detectDownTrendWarning', () => {
  it('returns null when normal', () => {
    expect(detectDownTrendWarning(ctx())).toBeNull()
  })
  it('detects bearish alignment', () => {
    const s = detectDownTrendWarning(ctx({
      stock: mkStock({
        ma5: Array(30).fill(90),
        ma20: Array(30).fill(95),
        ma60: Array(30).fill(100),
        ma120: Array(30).fill(110)
      })
    }))
    expect(s).not.toBeNull()
    expect(s!.tone).toBe('warning')
  })
})
```

- [ ] **Step 2: 테스트 실행**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx vitest run src/lib/stockMomentum/__tests__/detectors.test.ts`
Expected: 약 30 테스트 PASS

---

### Task 6: 집계 함수 테스트

**Files:**
- Create: `src/lib/stockMomentum/__tests__/index.test.ts`

- [ ] **Step 1: 구현**

```typescript
// src/lib/stockMomentum/__tests__/index.test.ts
import { describe, it, expect } from 'vitest'
import { analyzeMomentum } from '../index'
import type { DetectContext } from '../types'
import type { StockIndicators } from '@/lib/types/indicators'

function mkStock(overrides: Partial<StockIndicators> = {}): StockIndicators {
  return {
    name: 'T', market: 'KOSPI',
    dates: Array.from({ length: 30 }, (_, i) => `2026-04-${String(i + 1).padStart(2, '0')}`),
    close: Array(30).fill(1000), volume: Array(30).fill(1000),
    open: Array(30).fill(1000), high: Array(30).fill(1000), low: Array(30).fill(1000),
    ma5: Array(30).fill(1000), ma20: Array(30).fill(1000),
    ma60: Array(30).fill(1000), ma120: Array(30).fill(1000),
    rsi14: Array(30).fill(50),
    macd_line: Array(30).fill(0), macd_signal: Array(30).fill(0), macd_hist: Array(30).fill(0),
    bb_upper: Array(30).fill(1100), bb_middle: Array(30).fill(1000), bb_lower: Array(30).fill(900),
    high52w: 1200, has_52w: true, vol_avg20: 1000,
    ...overrides
  }
}

describe('analyzeMomentum', () => {
  it('returns empty when nothing matches', () => {
    const r = analyzeMomentum({ stock: mkStock() })
    expect(r.signals).toHaveLength(0)
    expect(r.bullishCount).toBe(0)
    expect(r.warningCount).toBe(0)
  })

  it('counts bullish and warning separately', () => {
    // RSI > 70 (warning) + volume spike (bullish)
    const volume = Array(30).fill(1000); volume[29] = 2000
    const close = Array(30).fill(1000); close[29] = 1050
    const rsi14 = Array(30).fill(50); rsi14[29] = 75
    const r = analyzeMomentum({
      stock: mkStock({ volume, close, rsi14, vol_avg20: 1000 })
    })
    expect(r.bullishCount).toBeGreaterThanOrEqual(1)
    expect(r.warningCount).toBeGreaterThanOrEqual(1)
  })

  it('sorts by category order then strength desc', () => {
    // chart 약한 신호 + ml 강한 신호
    const rsi14 = Array(30).fill(55); rsi14[29] = 60  // RSI C (⭐)
    const r = analyzeMomentum({
      stock: mkStock({ rsi14 }),
      mlPrediction: { probability: 0.9, ml_score: 20, top_features: [] }
    })
    const first = r.signals[0]
    expect(first.category).toBe('chart')  // chart가 ml보다 먼저
  })
})
```

- [ ] **Step 2: 테스트 실행**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx vitest run src/lib/stockMomentum`
Expected: 모든 테스트 PASS

- [ ] **Step 3: Phase A+B 중간 커밋**

```bash
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject add src/lib/bowl/ src/lib/stockMomentum/ src/components/stock/BowlPhaseIndicator.tsx
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject commit -m "feat(momentum): 12개 신호 detector + 집계 + 테스트 (Phase 19 A+B)"
```

---

## Phase 19C — UI (Tasks 7-9)

### Task 7: `StockMomentumPanel` 컴포넌트

**Files:**
- Create: `src/components/stock/StockMomentumPanel.tsx`

- [ ] **Step 1: 구현**

```typescript
'use client'
import { useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import { analyzeMomentum } from '@/lib/stockMomentum'
import type { DetectContext, Signal, SignalCategory } from '@/lib/stockMomentum/types'
import { strings } from '@/lib/strings/ko'

interface Props extends DetectContext {
  /** 모바일에서 기본 펼침 여부 */
  defaultOpen?: boolean
}

const CATEGORY_META: Record<SignalCategory, { emoji: string; label: string }> = {
  chart:      { emoji: '📈', label: '차트' },
  supply:     { emoji: '💰', label: '수급' },
  macro:      { emoji: '🌍', label: '매크로' },
  ml:         { emoji: '🤖', label: 'ML 예측' },
  historical: { emoji: '📊', label: '과거 유사' },
  bowl:       { emoji: '🍚', label: '밥그릇' },
  warning:    { emoji: '⚠️', label: '주의' }
}

function renderStars(n: 1 | 2 | 3): string {
  return '⭐'.repeat(n)
}

function timingLabel(t: Signal['timing']): string {
  if (t === 'latest') return strings.momentum.timingLatest
  if (t === 'recent') return strings.momentum.timingRecent
  return strings.momentum.timingOngoing
}

export default function StockMomentumPanel(props: Props) {
  const { defaultOpen = true, ...ctx } = props
  const analysis = useMemo(() => analyzeMomentum(ctx), [ctx])
  const [open, setOpen] = useState(defaultOpen)

  // 카테고리별 그룹핑
  const byCategory = useMemo(() => {
    const map = new Map<SignalCategory, Signal[]>()
    for (const s of analysis.signals) {
      const arr = map.get(s.category) ?? []
      arr.push(s)
      map.set(s.category, arr)
    }
    return map
  }, [analysis.signals])

  const header = (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-bold text-lg">{strings.momentum.panelTitle}</h3>
        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
          {strings.momentum.summary(analysis.bullishCount, analysis.warningCount)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-sm px-3 py-1 rounded-full bg-bg-secondary-light dark:bg-bg-secondary-dark"
        aria-label={open ? strings.momentum.collapseAria : strings.momentum.expandAria}
      >
        {open ? '▲' : '▼'}
      </button>
    </div>
  )

  if (analysis.signals.length === 0) {
    return (
      <Card padding="md" className="mt-4">
        {header}
        <p className="text-sm mt-3">{strings.momentum.emptyMessage}</p>
      </Card>
    )
  }

  if (!open) {
    return <Card padding="md" className="mt-4">{header}</Card>
  }

  return (
    <Card padding="md" className="mt-4">
      {header}
      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-2 mb-3">
        {strings.momentum.dataNote}
      </p>

      <div className="space-y-4">
        {Array.from(byCategory.entries()).map(([cat, sigs]) => {
          const meta = CATEGORY_META[cat]
          const isWarning = cat === 'warning'
          return (
            <section
              key={cat}
              className={`p-3 rounded-xl ${isWarning ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-bg-secondary-light dark:bg-bg-secondary-dark'}`}
            >
              <div className="text-sm font-bold mb-2">
                {meta.emoji} {meta.label} ({sigs.length}개)
              </div>
              <ul className="space-y-2">
                {sigs.map((s) => (
                  <li key={s.id} className="text-sm">
                    <div className="flex items-baseline justify-between gap-2">
                      <span>
                        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark mr-2">
                          {renderStars(s.strength)}
                        </span>
                        <span className="font-bold">{s.label}</span>
                        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark ml-2">
                          ({timingLabel(s.timing)})
                        </span>
                      </span>
                      {s.linkAnchor && (
                        <a
                          href={`#${s.linkAnchor}`}
                          className="text-xs underline text-text-secondary-light dark:text-text-secondary-dark"
                        >
                          {strings.momentum.moreLink}
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark ml-1">
                      {s.description}
                      {s.detail && ` · ${s.detail}`}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </Card>
  )
}
```

- [ ] **Step 2: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`

---

### Task 8: ko.ts momentum 섹션

**Files:**
- Modify: `src/lib/strings/ko.ts`

- [ ] **Step 1: momentum 섹션 추가**

기존 `ml` 섹션 뒤 또는 적절한 위치에 추가:

```typescript
  momentum: {
    panelTitle: '📊 오늘의 체크포인트',
    summary: (bullish: number, warning: number) =>
      `긍정 ${bullish}개 · 주의 ${warning}개`,
    emptyMessage: '감지된 신호가 없어요. 뉴스·공시·실적 이슈 가능성이 있어요.',
    dataNote: 'ℹ️ 데이터 기준: 어제 종가 · 뉴스·공시는 추적하지 않아요.',
    moreLink: '자세히 →',
    timingLatest: '어제 종가 기준',
    timingRecent: '최근',
    timingOngoing: '진행 중',
    expandAria: '체크포인트 펼치기',
    collapseAria: '체크포인트 접기'
  },
```

---

### Task 9: StockDetail 통합

**Files:**
- Modify: `src/app/[basePath]/stock/[code]/StockDetail.tsx`

StockDetail은 대형 파일이라 부분 수정.

- [ ] **Step 1: imports 추가**

```typescript
import StockMomentumPanel from '@/components/stock/StockMomentumPanel'
import { allPresets } from '@/lib/presets/registry'
import { loadPatternStats } from '@/lib/dataLoader'
import { loadSectorRotation } from '@/lib/dataLoader'
import { computeMacroBonus } from '@/lib/macro/scoring'
import { computeSectorRotationBonus } from '@/lib/macro/sectorRotation'
import { useMacroFactors } from '@/lib/macro/useMacroFactors'
import { useMlPredictions } from '@/lib/ml/useMlPredictions'
import { PANEL_ANCHORS } from '@/lib/stockMomentum/types'
import type { PatternStatsJson, SectorRotationJson } from '@/lib/types/indicators'
```

실제로 이미 일부 import되어 있을 수 있음 — 중복 제거.

- [ ] **Step 2: state 추가**

```typescript
const [patternStats, setPatternStats] = useState<PatternStatsJson | null>(null)
const [rotation, setRotation] = useState<SectorRotationJson | null>(null)
const { activeFactors } = useMacroFactors()
const mlPreds = useMlPredictions()
```

- [ ] **Step 3: data load에 추가 (기존 useEffect의 Promise.all에 append)**

기존 Promise.all에 `loadPatternStats(u.trade_date)`, `loadSectorRotation(u.trade_date)` 추가. setPatternStats, setRotation 호출.

- [ ] **Step 4: 공통 계산 (stock, fundamental 로드 후)**

```typescript
const themes = sectors?.[code]?.themes
const macroBonus = useMemo(() =>
  activeFactors.length > 0 && stock
    ? computeMacroBonus(stock.name, themes, activeFactors)
    : undefined,
  [stock, themes, activeFactors])
const sectorRotationBonus = useMemo(() =>
  rotation && themes ? computeSectorRotationBonus(themes, rotation) : undefined,
  [themes, rotation])
const mlPrediction = mlPreds?.predictions[code]
const matchedPresetIds = useMemo(() => {
  if (!stock) return []
  const ids: string[] = []
  for (const p of allPresets) {
    try {
      if (p.filter({ stock, fundamental, params: {} })) ids.push(p.id)
    } catch {}
  }
  return ids
}, [stock, fundamental])
```

- [ ] **Step 5: JSX에 패널 + anchor ID 배치**

기존 `<header>` (종목명·가격) 바로 다음에 `StockMomentumPanel` 삽입:

```tsx
<StockMomentumPanel
  stock={stock}
  ohlcvFull={ohlcvFull}
  fundamental={fundamental}
  macroBonus={macroBonus}
  sectorRotation={sectorRotationBonus}
  mlPrediction={mlPrediction}
  patternStats={patternStats?.by_stock_preset?.[code]}
  matchedPresetIds={matchedPresetIds}
/>
```

그리고 기존 각 패널을 `<section id="...">` 로 감싸기:

```tsx
<section id={PANEL_ANCHORS.matchedPresets}>
  <MatchedPresets stock={stock} fundamental={fundamental} />
</section>
<section id={PANEL_ANCHORS.bowlPhase}>
  <BowlPhaseIndicator stock={stock} />
</section>
<section id={PANEL_ANCHORS.bowlVolume}>
  <BowlVolumePanel stock={stock} fundamental={fundamental} />
</section>
<section id={PANEL_ANCHORS.macroDetail}>
  <MacroDetailPanel stockName={stock.name} themes={themes} basePath={basePath} code={code} />
</section>
<section id={PANEL_ANCHORS.mlPrediction}>
  <MLPredictionPanel code={code} />
</section>
```

- [ ] **Step 6: 빌드 + 테스트**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`
Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx vitest run`
Expected: 모든 테스트 PASS + 에러 없음

---

## Phase 19D — QA + PR (Task 10)

### Task 10: QA 체크리스트 + 커밋 + PR

- [ ] **Step 1: production build**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npm run build`
Expected: 성공

- [ ] **Step 2: 로컬 수동 QA (`npm run dev`)**

- [ ] 종목 상세 여러 개 접속 → 패널 렌더
- [ ] 신호 0개 종목: 빈 메시지 표시
- [ ] 주의 섹션 노란 배경
- [ ] "자세히 →" 클릭 → 해당 패널로 스크롤
- [ ] 모바일 (375px) — 접힘/펼침 동작
- [ ] 다크 모드

- [ ] **Step 3: Phase C+D 커밋**

```bash
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject add src/components/stock/StockMomentumPanel.tsx src/lib/strings/ko.ts src/app/\[basePath\]/stock/\[code\]/StockDetail.tsx
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject commit -m "feat(momentum): StockMomentumPanel UI + StockDetail 통합 (Phase 19 C+D)"
```

- [ ] **Step 4: 푸시**

```bash
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject push
```

- [ ] **Step 5: PR 생성**

URL: `https://github.com/pkh8184/MoneyProject/pull/new/feature/phase-19-momentum-panel`

**제목**: `Phase 19: 종목 상세 "오늘의 체크포인트" 패널`

**본문**:
```markdown
## Summary
- 12개 신호 판정 (차트 5 + 수급 1 + 매크로 1 + ML 1 + 과거 1 + 밥그릇 1 + 주의 2)
- 강도 ⭐ 1~3 + 시점 latest/recent/ongoing
- StockDetail 공통 계산 (macroBonus·matchedPresetIds) → 패널들 재사용
- 기존 패널 anchor ID 부여 → "자세히 →" in-page 링크
- bowl detectPhase util 공통 추출

## Test plan
- [x] detectors 단위 테스트 ~30건
- [x] analyzeMomentum 집계 테스트
- [x] tsc clean · build 성공
- [ ] 수동 QA (종목 여러 개 · 모바일 · 다크모드)

## 의존
- Phase 18 (pattern_stats 13 프리셋) 머지 후 과거 승률 신호 풍부해짐
- Phase 17 ML 훈련 후 ML 예측 신호 활성화
```

---

## Self-Review

**Spec coverage**:
- ✅ 12 signals → Tasks 2-4
- ✅ 타입 + bowl util → Task 1
- ✅ StockDetail 공통 계산 → Task 9
- ✅ anchor ID → Task 9
- ✅ UI 패널 → Task 7
- ✅ ko.ts → Task 8
- ✅ 테스트 → Tasks 5-6
- ✅ QA + PR → Task 10

**Type consistency**:
- `Signal`, `DetectContext`, `MomentumAnalysis` 타입 Task 1에 정의 → 이후 Task 전부 일관 사용
- `PANEL_ANCHORS` 상수 Task 1 정의 → Task 9 사용
- `detectBowlPhase` util Task 1 → Task 3 detectBowlPhase3 에서 재사용

**Placeholder scan**: 없음. 모든 코드 완전.

**알려진 이슈·제약**:
- ML 미훈련 상태에선 ML 신호 null (정상)
- 매크로 팩터 미활성 시 섹터만으로 ⭐ (정상)
- `fix/recommend-filter-negative` PR 머지 전 작업 가능 (독립적)
