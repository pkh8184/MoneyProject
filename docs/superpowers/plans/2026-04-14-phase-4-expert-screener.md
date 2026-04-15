# Phase 4 — 전문가 모드 검색기 (프리셋 엔진 + 결과 테이블) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 10개 단일 프리셋 + 2개 조합 프리셋의 필터링 로직을 구현하고, 전문가 모드 UI(사이드바 프리셋 선택 + 결과 테이블 + 파라미터 슬라이더)를 완성한다.

**Architecture:** 프리셋은 `Preset` 인터페이스를 구현하는 각 파일로 분리. `runPreset` 엔진이 indicators.json + fundamentals.json을 받아 조건 함수 적용 후 결과 정렬·페이징. 브라우저에서 모든 필터링 수행.

**Tech Stack:** Next.js 14 Client Components + Zustand + Tailwind + TypeScript

**Branch:** `feature/phase-4-expert-screener` (Phase 3 기반)

**Prerequisite:** Phase 3 완료 (Header/Footer/Providers, Zustand store, [basePath]/screener stub)

---

## 📁 File Structure

**프리셋 엔진**
- `src/lib/presets/types.ts` — Preset 인터페이스 (기존 `types/presets.ts`에서 확장)
- `src/lib/presets/registry.ts` — 전체 프리셋 맵
- `src/lib/presets/utils.ts` — 공통 헬퍼 (oneDayAgo, safeGet 등)
- `src/lib/presets/golden_cross.ts` — 1. 골든크로스
- `src/lib/presets/alignment.ts` — 2. 정배열
- `src/lib/presets/ma60_turn_up.ts` — 3. 60일선 상승 전환
- `src/lib/presets/high_52w.ts` — 4. 52주 신고가 돌파
- `src/lib/presets/volume_spike.ts` — 5. 거래량 급증
- `src/lib/presets/foreign_inst_buy.ts` — 6. 외국인·기관 동반 순매수
- `src/lib/presets/rsi_rebound.ts` — 7. RSI 과매도 반등
- `src/lib/presets/macd_cross.ts` — 8. MACD 골든크로스
- `src/lib/presets/bb_lower_bounce.ts` — 9. 볼린저밴드 하단 복귀
- `src/lib/presets/low_pbr.ts` — 10. PBR 저평가
- `src/lib/presets/combo_golden.ts` — 11. 중장기 황금 조합
- `src/lib/presets/combo_value_rebound.ts` — 12. 저평가 반등

**필터 엔진**
- `src/lib/filter.ts` — runPreset 함수 (전체 종목 순회, 조건 적용, 정렬, 페이징)
- `src/lib/__tests__/filter.test.ts`

**프리셋 테스트**
- `src/lib/presets/__tests__/golden_cross.test.ts`
- `src/lib/presets/__tests__/alignment.test.ts`
- (기타 프리셋별 테스트 — 최소 2~3개 대표 케이스)

**데이터 로더 확장**
- `src/lib/dataLoader.ts` — loadIndicators, loadFundamentals 추가
- IndexedDB 캐싱 (idb-keyval 라이브러리 사용)

**전문가 UI**
- `src/app/[basePath]/screener/ExpertScreener.tsx` — Client Component
- `src/components/screener/PresetSidebar.tsx`
- `src/components/screener/ResultTable.tsx`
- `src/components/screener/ParamControls.tsx` — 슬라이더·토글 폼
- `src/components/screener/PresetDescription.tsx` — 매수 타이밍·손절 등 안내
- `src/app/[basePath]/screener/page.tsx` — ExpertScreener 호출 (조건부 렌더는 Phase 5)

**문자열**
- `src/lib/strings/ko.ts` — 프리셋 이름·설명 12개 추가

---

## Task 1: 브랜치 생성 + idb-keyval 설치

- [ ] **Step 1: 브랜치**
```bash
cd c:/Users/rk454/Desktop/Project/Money/MoneyProject
git checkout feature/phase-3-frontend-base
git checkout -b feature/phase-4-expert-screener
```

- [ ] **Step 2: 의존성**
```bash
npm install idb-keyval@^6.2.1
```

- [ ] **Step 3: 커밋**
```bash
git add package.json package-lock.json
git commit -m "feat(phase-4): add idb-keyval for IndexedDB caching"
```

---

## Task 2: 프리셋 인터페이스 + 레지스트리 + 문자열

- [ ] **Step 1: `src/lib/presets/types.ts`**

```typescript
import type { StockIndicators, Fundamental } from '@/lib/types/indicators'
import type { PresetMeta, ParamDef } from '@/lib/types/presets'

export type PresetParams = Record<string, number | boolean>

export interface FilterContext {
  stock: StockIndicators
  fundamental: Fundamental | undefined
  params: PresetParams
}

export interface Preset extends PresetMeta {
  filter: (ctx: FilterContext) => boolean
  sortScore?: (ctx: FilterContext) => number
}
```

- [ ] **Step 2: `src/lib/presets/utils.ts`**

```typescript
/** 배열의 마지막 값. 없거나 null이면 undefined. */
export function latest<T>(arr: (T | null | undefined)[]): T | undefined {
  if (!arr || arr.length === 0) return undefined
  const v = arr[arr.length - 1]
  return v == null ? undefined : v
}

/** 배열의 끝에서 n번째 값 (0=마지막). */
export function prev<T>(arr: (T | null | undefined)[], offset: number): T | undefined {
  if (!arr || arr.length < offset + 1) return undefined
  const v = arr[arr.length - 1 - offset]
  return v == null ? undefined : v
}

/** 모든 값이 유효(null/undefined 아님)하면 true */
export function allValid(...vals: unknown[]): boolean {
  return vals.every((v) => v !== null && v !== undefined)
}
```

- [ ] **Step 3: `src/lib/strings/ko.ts` 확장**

기존 `strings.screener` 아래에 프리셋 관련 문자열 추가. 현재 `strings` 객체에 다음을 추가:

```typescript
presets: {
  golden_cross: {
    name: '골든크로스 (MA20↑MA60)',
    beginnerDesc: '단기 상승 신호가 처음 나타난 종목',
    expertDesc: '20일선이 60일선을 상향 돌파한 종목 (오늘)',
    buyTiming: '돌파 당일 종가 또는 다음 날 시초가',
    holdingPeriod: '2주~3개월',
    stopLoss: 'MA20 재하향 이탈 시',
    traps: '횡보장에서 가짜 신호 발생. 거래량 조건 결합 권장'
  },
  alignment: {
    name: '정배열 확정 (MA5>MA20>MA60>MA120)',
    beginnerDesc: '추세가 정식 확정된 종목',
    expertDesc: '4개 이평선이 정배열 완성된 첫날',
    buyTiming: '정배열 유지되면서 MA20 터치 후 반등 시점',
    holdingPeriod: '1~6개월',
    stopLoss: 'MA20 하향 이탈',
    traps: '이미 많이 오른 종목은 피크 근접 위험'
  },
  ma60_turn_up: {
    name: '60일선 상승 전환',
    beginnerDesc: '중기 추세가 상승으로 바뀐 종목',
    expertDesc: 'MA60 기울기 음→양 전환',
    buyTiming: '전환 후 첫 눌림목',
    holdingPeriod: '1~3개월',
    stopLoss: 'MA60 재하향',
    traps: '신호 빈도 낮음'
  },
  high_52w: {
    name: '52주 신고가 돌파',
    beginnerDesc: '1년 내 최고가에 근접한 종목',
    expertDesc: '종가가 52주 신고가의 N% 이상',
    buyTiming: '돌파 당일 또는 눌림',
    holdingPeriod: '수일~1개월',
    stopLoss: '돌파 당일 저가 이탈',
    traps: '돌파 실패 시 급락 위험'
  },
  volume_spike: {
    name: '거래량 급증',
    beginnerDesc: '거래량이 평소보다 크게 늘어난 종목',
    expertDesc: '양봉 + 거래량이 20일 평균의 K배 이상',
    buyTiming: '급증 발생일 종가 또는 다음 날 눌림',
    holdingPeriod: '3일~3주',
    stopLoss: '급증 봉 저가 이탈',
    traps: '음봉 + 거래량 급증은 매도 신호'
  },
  foreign_inst_buy: {
    name: '외국인·기관 동반 순매수',
    beginnerDesc: '큰 손이 함께 사는 종목',
    expertDesc: '최근 N일 외국인·기관 모두 순매수',
    buyTiming: '연속 매수 3~5일차',
    holdingPeriod: '1주~1개월',
    stopLoss: '순매도 전환',
    traps: '단기 차익실현 가능성'
  },
  rsi_rebound: {
    name: 'RSI 과매도 반등',
    beginnerDesc: '과매도 구간 후 반등 시작',
    expertDesc: 'RSI 30 이하에서 재돌파, MA60 상승 추세',
    buyTiming: '30 재돌파 당일',
    holdingPeriod: '1주~1개월',
    stopLoss: '직전 저점 이탈',
    traps: '하락 추세 중 과매도는 더 깊어질 수 있음'
  },
  macd_cross: {
    name: 'MACD 골든크로스',
    beginnerDesc: '상승 추세 시작 신호',
    expertDesc: 'MACD 라인이 Signal 라인 상향 돌파',
    buyTiming: '돌파일 종가',
    holdingPeriod: '2주~2개월',
    stopLoss: '재데드크로스',
    traps: '횡보장에서 신호 남발'
  },
  bb_lower_bounce: {
    name: '볼린저밴드 하단 복귀',
    beginnerDesc: '저점에서 반등 시작',
    expertDesc: '하단 이탈 후 밴드 내 재진입',
    buyTiming: '재진입 당일 종가',
    holdingPeriod: '수일~3주',
    stopLoss: '하단 재이탈',
    traps: '강한 하락 추세에서는 계속 하단 이탈'
  },
  low_pbr: {
    name: 'PBR 저평가',
    beginnerDesc: '자산 대비 저평가된 종목',
    expertDesc: 'PBR < K (파라미터)',
    buyTiming: '기술적 신호와 결합 시',
    holdingPeriod: '중장기',
    stopLoss: '업종 악재 발생 시',
    traps: '저 PBR은 저평가가 아닌 구조적 문제일 수도'
  },
  combo_golden: {
    name: '⭐ 중장기 황금 조합',
    beginnerDesc: '가장 신뢰할 수 있는 중장기 상승 신호',
    expertDesc: '골든크로스 + 거래량 급증 + RSI>50',
    buyTiming: '조건 일치 당일 종가',
    holdingPeriod: '1~3개월',
    stopLoss: 'MA20 이탈',
    traps: '조건이 겹칠 확률 낮음 (희소 신호)'
  },
  combo_value_rebound: {
    name: '⭐ 저평가 반등',
    beginnerDesc: '저평가에서 반등 시작',
    expertDesc: 'PBR<1 + RSI 반등 + MA60 지지',
    buyTiming: '반등 당일 종가',
    holdingPeriod: '1~6개월',
    stopLoss: 'MA60 하향 이탈',
    traps: '구조적 저 PBR 종목은 반등이 약할 수 있음'
  }
}
```

이 섹션을 `strings` 객체 내부에 추가.

- [ ] **Step 4: type-check + commit**

```bash
npm run type-check
git add src/lib/presets/ src/lib/strings/ko.ts
git commit -m "feat(phase-4): add preset interface, utils, and string resources"
```

---

## Task 3: 첫 프리셋 구현 (golden_cross) — TDD

**Files:** 
- Create: `src/lib/presets/golden_cross.ts`
- Create: `src/lib/presets/__tests__/golden_cross.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// src/lib/presets/__tests__/golden_cross.test.ts
import { describe, it, expect } from 'vitest'
import { goldenCross } from '../golden_cross'
import type { StockIndicators } from '@/lib/types/indicators'

function mkStock(ma20: (number|null)[], ma60: (number|null)[]): StockIndicators {
  return {
    name: 'T', market: 'KOSPI',
    dates: ['2026-04-13', '2026-04-14'],
    close: [100, 101],
    volume: [1000, 1100],
    ma5: [null, null], ma20, ma60,
    ma120: [null, null],
    rsi14: [null, null],
    macd_line: [null, null], macd_signal: [null, null], macd_hist: [null, null],
    bb_upper: [null, null], bb_middle: [null, null], bb_lower: [null, null],
    high52w: null, has_52w: false, vol_avg20: null
  }
}

describe('goldenCross preset', () => {
  it('matches when ma20 crosses above ma60 today', () => {
    const stock = mkStock([99, 101], [100, 100])  // yesterday: 99<=100, today: 101>100
    expect(goldenCross.filter({ stock, fundamental: undefined, params: {} })).toBe(true)
  })

  it('does not match when no cross today (was already above yesterday)', () => {
    const stock = mkStock([102, 103], [100, 100])
    expect(goldenCross.filter({ stock, fundamental: undefined, params: {} })).toBe(false)
  })

  it('does not match when ma20 still below ma60', () => {
    const stock = mkStock([90, 95], [100, 100])
    expect(goldenCross.filter({ stock, fundamental: undefined, params: {} })).toBe(false)
  })

  it('does not match when data missing', () => {
    const stock = mkStock([null, null], [100, 100])
    expect(goldenCross.filter({ stock, fundamental: undefined, params: {} })).toBe(false)
  })
})
```

- [ ] **Step 2: 실패 확인 + 구현**

```typescript
// src/lib/presets/golden_cross.ts
import { strings } from '@/lib/strings/ko'
import { prev, latest, allValid } from './utils'
import type { Preset } from './types'

export const goldenCross: Preset = {
  id: 'golden_cross',
  name: strings.presets.golden_cross.name,
  mode: ['expert'],
  params: [],
  description: {
    beginner: strings.presets.golden_cross.beginnerDesc,
    expert: strings.presets.golden_cross.expertDesc
  },
  buyTiming: strings.presets.golden_cross.buyTiming,
  holdingPeriod: strings.presets.golden_cross.holdingPeriod,
  stopLoss: strings.presets.golden_cross.stopLoss,
  traps: strings.presets.golden_cross.traps,

  filter: ({ stock }) => {
    const ma20Today = latest(stock.ma20)
    const ma60Today = latest(stock.ma60)
    const ma20Yest = prev(stock.ma20, 1)
    const ma60Yest = prev(stock.ma60, 1)
    if (!allValid(ma20Today, ma60Today, ma20Yest, ma60Yest)) return false
    return (ma20Today! > ma60Today!) && (ma20Yest! <= ma60Yest!)
  },
  
  sortScore: ({ stock }) => latest(stock.volume) ?? 0
}
```

- [ ] **Step 3: 테스트 통과 + commit**

```bash
npm test src/lib/presets/__tests__/golden_cross.test.ts
git add src/lib/presets/golden_cross.ts src/lib/presets/__tests__/golden_cross.test.ts
git commit -m "feat(phase-4): implement golden_cross preset (TDD)"
```

---

## Task 4-11: 나머지 9개 단일 프리셋 + 2개 조합

각 프리셋마다 동일한 TDD 패턴(테스트 2~3개 + 구현 + commit). Task 3을 템플릿으로 사용.

### 프리셋별 조건식 (간략)

```typescript
// alignment: MA5>MA20>MA60>MA120 오늘, 어제는 아니었음
// ma60_turn_up: MA60[t]>MA60[t-5] AND MA60[t-5]<=MA60[t-10]
// high_52w: close[t] >= high52w * ratio (param)
// volume_spike: volume[t] >= vol_avg20 * K (param) AND close[t]>open[t]
//   → 주의: open은 StockIndicators에 없음. close[t]>close[t-1] 근사치 사용
// foreign_inst_buy: fundamental.foreign_net[-N:] 전부 > 0, inst_net도
// rsi_rebound: rsi14[t]>30, min(rsi14[t-5:t-1])<=30, ma60 기울기 > 0
// macd_cross: macd_line[t]>signal[t], macd_line[t-1]<=signal[t-1], param above_zero 옵션
// bb_lower_bounce: close[t]>=bb_lower[t], close[t-1]<bb_lower[t-1]
// low_pbr: fundamental.pbr < K (param), pbr > 0
// combo_golden: golden_cross + volume_spike(K=1.5) + rsi14[t]>50
// combo_value_rebound: low_pbr(K=1.0) + rsi_rebound + MA60 근처(+-5%)
```

**Task 4: alignment**
```typescript
filter: ({ stock }) => {
  const m5 = latest(stock.ma5), m20 = latest(stock.ma20)
  const m60 = latest(stock.ma60), m120 = latest(stock.ma120)
  const m5y = prev(stock.ma5, 1), m20y = prev(stock.ma20, 1)
  const m60y = prev(stock.ma60, 1), m120y = prev(stock.ma120, 1)
  if (!allValid(m5, m20, m60, m120, m5y, m20y, m60y, m120y)) return false
  const alignedToday = m5! > m20! && m20! > m60! && m60! > m120!
  const alignedYest = m5y! > m20y! && m20y! > m60y! && m60y! > m120y!
  return alignedToday && !alignedYest
}
```

**Task 5: ma60_turn_up** — prev(stock.ma60, 5), prev(stock.ma60, 10) 비교

**Task 6: high_52w**
```typescript
params: [{ key: 'ratio', label: '신고가 근접도', type: 'slider', min: 0.8, max: 1.0, step: 0.01, default: 1.0 }],
filter: ({ stock, params }) => {
  const c = latest(stock.close)
  if (c == null || stock.high52w == null || !stock.has_52w) return false
  const r = Number(params.ratio ?? 1.0)
  return c >= stock.high52w * r
}
```

**Task 7: volume_spike**
```typescript
params: [{ key: 'K', label: '거래량 배수', type: 'slider', min: 1.2, max: 3.0, step: 0.1, default: 1.5 }],
filter: ({ stock, params }) => {
  const v = latest(stock.volume), va = stock.vol_avg20
  const c = latest(stock.close), cy = prev(stock.close, 1)
  if (!allValid(v, va, c, cy)) return false
  const K = Number(params.K ?? 1.5)
  return v! >= va! * K && c! > cy!
}
```

**Task 8: foreign_inst_buy**
```typescript
params: [{ key: 'N', label: '연속일 수', type: 'slider', min: 2, max: 10, step: 1, default: 3 }],
filter: ({ fundamental, params }) => {
  if (!fundamental) return false
  const N = Number(params.N ?? 3)
  const f = fundamental.foreign_net.slice(-N)
  const i = fundamental.institution_net.slice(-N)
  if (f.length < N || i.length < N) return false
  return f.every((x) => x > 0) && i.every((x) => x > 0)
}
```

**Task 9: rsi_rebound**
```typescript
filter: ({ stock }) => {
  const today = latest(stock.rsi14)
  if (today == null || today <= 30) return false
  // 최근 5일(어제 포함 5개) 중 30 이하 하나라도 있었는지
  const recent5 = stock.rsi14.slice(-6, -1).filter((v): v is number => v != null)
  if (recent5.length === 0 || !recent5.some((v) => v <= 30)) return false
  // MA60 상승 추세 확인
  const m60 = latest(stock.ma60), m60_20 = prev(stock.ma60, 20)
  if (!allValid(m60, m60_20)) return false
  return m60! > m60_20!
}
```

**Task 10: macd_cross**
```typescript
params: [{ key: 'above_zero', label: '0선 이상만', type: 'toggle', default: false }],
filter: ({ stock, params }) => {
  const lt = latest(stock.macd_line), st = latest(stock.macd_signal)
  const ly = prev(stock.macd_line, 1), sy = prev(stock.macd_signal, 1)
  if (!allValid(lt, st, ly, sy)) return false
  if (!(lt! > st! && ly! <= sy!)) return false
  if (params.above_zero && lt! <= 0) return false
  return true
}
```

**Task 11: bb_lower_bounce**
```typescript
filter: ({ stock }) => {
  const c = latest(stock.close), cy = prev(stock.close, 1)
  const bl = latest(stock.bb_lower), bly = prev(stock.bb_lower, 1)
  if (!allValid(c, cy, bl, bly)) return false
  return c! >= bl! && cy! < bly!
}
```

**Task 12: low_pbr**
```typescript
params: [{ key: 'K', label: 'PBR 기준', type: 'slider', min: 0.5, max: 1.5, step: 0.05, default: 1.0 }],
filter: ({ fundamental, params }) => {
  if (!fundamental || fundamental.pbr == null || fundamental.pbr <= 0) return false
  const K = Number(params.K ?? 1.0)
  return fundamental.pbr < K
},
sortScore: ({ fundamental }) => -(fundamental?.pbr ?? 999)  // 낮은 PBR 우선
```

**Task 13: combo_golden**
```typescript
import { goldenCross } from './golden_cross'
import { volumeSpike } from './volume_spike'

filter: (ctx) => {
  if (!goldenCross.filter(ctx)) return false
  if (!volumeSpike.filter({ ...ctx, params: { K: 1.5 } })) return false
  const rsi = latest(ctx.stock.rsi14)
  if (rsi == null) return false
  return rsi > 50
}
```

**Task 14: combo_value_rebound**
```typescript
import { lowPbr } from './low_pbr'
import { rsiRebound } from './rsi_rebound'

filter: (ctx) => {
  if (!lowPbr.filter({ ...ctx, params: { K: 1.0 } })) return false
  if (!rsiRebound.filter(ctx)) return false
  const c = latest(ctx.stock.close), m60 = latest(ctx.stock.ma60)
  if (!allValid(c, m60)) return false
  // MA60 근처 지지: MA60 <= c <= MA60 * 1.05
  return c! >= m60! && c! <= m60! * 1.05
}
```

각 Task마다:
1. 2~3개 대표 테스트 작성 (true/false/missing 케이스)
2. 구현
3. 테스트 통과
4. 커밋: `feat(phase-4): implement <id> preset`

---

## Task 15: 프리셋 레지스트리

**File:** `src/lib/presets/registry.ts`

```typescript
import { goldenCross } from './golden_cross'
import { alignment } from './alignment'
import { ma60TurnUp } from './ma60_turn_up'
import { high52w } from './high_52w'
import { volumeSpike } from './volume_spike'
import { foreignInstBuy } from './foreign_inst_buy'
import { rsiRebound } from './rsi_rebound'
import { macdCross } from './macd_cross'
import { bbLowerBounce } from './bb_lower_bounce'
import { lowPbr } from './low_pbr'
import { comboGolden } from './combo_golden'
import { comboValueRebound } from './combo_value_rebound'
import type { Preset } from './types'

export const allPresets: Preset[] = [
  goldenCross, alignment, ma60TurnUp, high52w,
  volumeSpike, foreignInstBuy, rsiRebound, macdCross,
  bbLowerBounce, lowPbr, comboGolden, comboValueRebound
]

export const presetMap: Record<string, Preset> = Object.fromEntries(
  allPresets.map((p) => [p.id, p])
)

export function getPresetById(id: string): Preset | undefined {
  return presetMap[id]
}

export function getExpertPresets(): Preset[] {
  return allPresets.filter((p) => p.mode.includes('expert'))
}

export function getBeginnerPresets(): Preset[] {
  return allPresets.filter((p) => p.mode.includes('beginner'))
}
```

- [ ] **Verify + commit**
```bash
npm run type-check
git add src/lib/presets/registry.ts
git commit -m "feat(phase-4): add preset registry"
```

---

## Task 16: filter 엔진 (TDD)

**Files:**
- Create: `src/lib/filter.ts`, `src/lib/__tests__/filter.test.ts`

### Test
```typescript
import { describe, it, expect } from 'vitest'
import { runPreset, type FilterResult } from '../filter'
import { goldenCross } from '../presets/golden_cross'
import type { IndicatorsJson, FundamentalsJson } from '@/lib/types/indicators'

describe('runPreset', () => {
  it('returns matching stocks sorted', () => {
    const indicators: any = {
      meta: { updated_at: '', trade_date: '2026-04-14', stock_count: 2, days: 30 },
      'AAA': {
        name: 'A', market: 'KOSPI',
        dates: ['2026-04-13','2026-04-14'], close: [100, 105], volume: [1000, 5000],
        ma5: [null, null], ma20: [99, 101], ma60: [100, 100],
        ma120: [null,null], rsi14: [null,null],
        macd_line:[null,null], macd_signal:[null,null], macd_hist:[null,null],
        bb_upper:[null,null], bb_middle:[null,null], bb_lower:[null,null],
        high52w: null, has_52w: false, vol_avg20: null
      },
      'BBB': {
        name: 'B', market: 'KOSPI',
        dates: ['2026-04-13','2026-04-14'], close: [100, 105], volume: [2000, 3000],
        ma5: [null, null], ma20: [99, 101], ma60: [100, 100],
        ma120: [null,null], rsi14: [null,null],
        macd_line:[null,null], macd_signal:[null,null], macd_hist:[null,null],
        bb_upper:[null,null], bb_middle:[null,null], bb_lower:[null,null],
        high52w: null, has_52w: false, vol_avg20: null
      }
    }
    const fundamentals: FundamentalsJson = {}
    const results = runPreset(goldenCross, indicators, fundamentals, {})
    expect(results.length).toBe(2)
    expect(results[0].code).toBe('AAA')  // volume 5000 > 3000
  })

  it('limits results to 100', () => {
    // Generate 150 matching stocks
    const indicators: any = { meta: {} }
    for (let i = 0; i < 150; i++) {
      indicators[`T${i}`] = {
        name: `T${i}`, market: 'KOSPI',
        dates: ['2026-04-13','2026-04-14'], close: [100, 105], volume: [1000+i, 1000+i],
        ma5:[null,null], ma20:[99,101], ma60:[100,100], ma120:[null,null],
        rsi14:[null,null],
        macd_line:[null,null], macd_signal:[null,null], macd_hist:[null,null],
        bb_upper:[null,null], bb_middle:[null,null], bb_lower:[null,null],
        high52w:null, has_52w:false, vol_avg20:null
      }
    }
    const results = runPreset(goldenCross, indicators, {}, {})
    expect(results.length).toBe(100)
  })

  it('returns empty when no matches', () => {
    const indicators: any = { meta: {}, 'AAA': {
      name:'A', market:'KOSPI',
      dates:[], close:[], volume:[],
      ma5:[], ma20:[], ma60:[], ma120:[], rsi14:[],
      macd_line:[], macd_signal:[], macd_hist:[],
      bb_upper:[], bb_middle:[], bb_lower:[],
      high52w:null, has_52w:false, vol_avg20:null
    }}
    const results = runPreset(goldenCross, indicators, {}, {})
    expect(results.length).toBe(0)
  })
})
```

### Implementation
```typescript
// src/lib/filter.ts
import type { Preset, PresetParams } from './presets/types'
import type { IndicatorsJson, FundamentalsJson, StockIndicators } from '@/lib/types/indicators'

export interface FilterResult {
  code: string
  name: string
  market: string
  price: number | null
  volume: number | null
  rsi: number | null
  score: number
}

const MAX_RESULTS = 100

export function runPreset(
  preset: Preset,
  indicators: IndicatorsJson,
  fundamentals: FundamentalsJson,
  params: PresetParams
): FilterResult[] {
  const results: FilterResult[] = []

  for (const [code, value] of Object.entries(indicators)) {
    if (code === 'meta') continue
    const stock = value as StockIndicators
    const fundamental = fundamentals[code]
    try {
      if (!preset.filter({ stock, fundamental, params })) continue
      const score = preset.sortScore
        ? preset.sortScore({ stock, fundamental, params })
        : 0
      results.push({
        code,
        name: stock.name,
        market: stock.market,
        price: stock.close.at(-1) ?? null,
        volume: stock.volume.at(-1) ?? null,
        rsi: stock.rsi14.at(-1) ?? null,
        score
      })
    } catch {
      // 개별 종목 에러는 스킵
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, MAX_RESULTS)
}
```

### Verify + commit
```bash
npm test src/lib/__tests__/filter.test.ts
git add src/lib/filter.ts src/lib/__tests__/filter.test.ts
git commit -m "feat(phase-4): implement filter engine with TDD"
```

---

## Task 17: dataLoader 확장 (indicators/fundamentals fetch + IndexedDB)

**File:** `src/lib/dataLoader.ts` (확장)

기존 함수 아래에 추가:

```typescript
import { get, set } from 'idb-keyval'
import type { IndicatorsJson, FundamentalsJson } from '@/lib/types/indicators'

const IDB_INDICATORS_KEY = 'indicators-cache-v1'
const IDB_FUNDAMENTALS_KEY = 'fundamentals-cache-v1'

interface CachedData<T> {
  trade_date: string
  data: T
}

async function getCached<T>(key: string, tradeDate: string): Promise<T | null> {
  try {
    const cached = await get<CachedData<T>>(key)
    if (cached && cached.trade_date === tradeDate) return cached.data
  } catch { /* IndexedDB unavailable */ }
  return null
}

async function setCached<T>(key: string, tradeDate: string, data: T): Promise<void> {
  try {
    await set(key, { trade_date: tradeDate, data })
  } catch { /* ignore */ }
}

export async function loadIndicators(tradeDate: string): Promise<IndicatorsJson | null> {
  const cached = await getCached<IndicatorsJson>(IDB_INDICATORS_KEY, tradeDate)
  if (cached) return cached

  try {
    const res = await fetch('/data/indicators.json', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as IndicatorsJson
    await setCached(IDB_INDICATORS_KEY, tradeDate, data)
    return data
  } catch {
    return null
  }
}

export async function loadFundamentals(tradeDate: string): Promise<FundamentalsJson | null> {
  const cached = await getCached<FundamentalsJson>(IDB_FUNDAMENTALS_KEY, tradeDate)
  if (cached) return cached

  try {
    const res = await fetch('/data/fundamentals.json', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as FundamentalsJson
    await setCached(IDB_FUNDAMENTALS_KEY, tradeDate, data)
    return data
  } catch {
    return null
  }
}
```

- [ ] **type-check + commit**
```bash
npm run type-check
git add src/lib/dataLoader.ts
git commit -m "feat(phase-4): extend dataLoader with indicators/fundamentals + IndexedDB cache"
```

---

## Task 18: 전문가 UI 컴포넌트

### `src/components/screener/PresetSidebar.tsx`
```tsx
'use client'

import type { Preset } from '@/lib/presets/types'

interface Props {
  presets: Preset[]
  activeId: string | null
  onSelect: (id: string) => void
}

export default function PresetSidebar({ presets, activeId, onSelect }: Props) {
  return (
    <aside className="w-full md:w-60 border-r border-border-light dark:border-border-dark">
      <ul className="flex md:flex-col overflow-x-auto md:overflow-visible">
        {presets.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onSelect(p.id)}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark ${
                activeId === p.id ? 'bg-bg-secondary-light dark:bg-bg-secondary-dark font-bold' : ''
              }`}
            >
              {p.name}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
```

### `src/components/screener/ResultTable.tsx`
```tsx
'use client'

import type { FilterResult } from '@/lib/filter'
import { strings } from '@/lib/strings/ko'

interface Props {
  results: FilterResult[]
  loading: boolean
}

export default function ResultTable({ results, loading }: Props) {
  if (loading) return <p className="text-sm">{strings.common.loading}</p>
  if (results.length === 0) return <p className="text-sm">{strings.screener.empty}</p>

  return (
    <div className="overflow-x-auto">
      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-2">
        {strings.screener.resultCount(results.length)}
      </p>
      <table className="w-full text-sm">
        <thead className="border-b border-border-light dark:border-border-dark">
          <tr className="text-left">
            <th className="py-2 pr-4">코드</th>
            <th className="py-2 pr-4">종목명</th>
            <th className="py-2 pr-4">시장</th>
            <th className="py-2 pr-4 text-right">현재가</th>
            <th className="py-2 pr-4 text-right">거래량</th>
            <th className="py-2 text-right">RSI</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.code} className="border-b border-border-light dark:border-border-dark">
              <td className="py-2 pr-4 font-mono text-xs">{r.code}</td>
              <td className="py-2 pr-4">{r.name}</td>
              <td className="py-2 pr-4 text-xs text-text-secondary-light dark:text-text-secondary-dark">{r.market}</td>
              <td className="py-2 pr-4 text-right">{r.price?.toLocaleString() ?? '-'}</td>
              <td className="py-2 pr-4 text-right text-xs">{r.volume?.toLocaleString() ?? '-'}</td>
              <td className="py-2 text-right">{r.rsi?.toFixed(1) ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

### `src/components/screener/ParamControls.tsx`
```tsx
'use client'

import type { ParamDef } from '@/lib/types/presets'
import type { PresetParams } from '@/lib/presets/types'

interface Props {
  params: ParamDef[]
  values: PresetParams
  onChange: (next: PresetParams) => void
}

export default function ParamControls({ params, values, onChange }: Props) {
  if (params.length === 0) return null
  return (
    <div className="space-y-3 p-4 bg-bg-secondary-light dark:bg-bg-secondary-dark rounded">
      {params.map((p) => {
        const v = values[p.key] ?? p.default
        if (p.type === 'slider') {
          return (
            <label key={p.key} className="block">
              <span className="text-xs">{p.label}: {v}</span>
              <input
                type="range"
                min={p.min}
                max={p.max}
                step={p.step}
                value={typeof v === 'boolean' ? 0 : v}
                onChange={(e) => onChange({ ...values, [p.key]: Number(e.target.value) })}
                className="w-full"
              />
            </label>
          )
        }
        return (
          <label key={p.key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(v)}
              onChange={(e) => onChange({ ...values, [p.key]: e.target.checked })}
            />
            {p.label}
          </label>
        )
      })}
    </div>
  )
}
```

### `src/components/screener/PresetDescription.tsx`
```tsx
import type { Preset } from '@/lib/presets/types'

export default function PresetDescription({ preset }: { preset: Preset }) {
  return (
    <div className="text-xs space-y-1 mb-4">
      <p>{preset.description.expert}</p>
      <p><strong>매수 타이밍:</strong> {preset.buyTiming}</p>
      <p><strong>보유 기간:</strong> {preset.holdingPeriod}</p>
      <p><strong>손절 기준:</strong> {preset.stopLoss}</p>
      <p className="text-text-secondary-light dark:text-text-secondary-dark">
        <strong>주의:</strong> {preset.traps}
      </p>
    </div>
  )
}
```

- [ ] **type-check + commit**
```bash
npm run type-check
git add src/components/screener/
git commit -m "feat(phase-4): add screener UI components (sidebar, table, params, desc)"
```

---

## Task 19: ExpertScreener 컨테이너 + Screener page 연결

### `src/app/[basePath]/screener/ExpertScreener.tsx`
```tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import PresetSidebar from '@/components/screener/PresetSidebar'
import ResultTable from '@/components/screener/ResultTable'
import ParamControls from '@/components/screener/ParamControls'
import PresetDescription from '@/components/screener/PresetDescription'
import { getExpertPresets, getPresetById } from '@/lib/presets/registry'
import { runPreset, type FilterResult } from '@/lib/filter'
import { loadIndicators, loadFundamentals, loadUpdatedAt } from '@/lib/dataLoader'
import type { IndicatorsJson, FundamentalsJson } from '@/lib/types/indicators'
import type { PresetParams } from '@/lib/presets/types'

export default function ExpertScreener() {
  const [indicators, setIndicators] = useState<IndicatorsJson | null>(null)
  const [fundamentals, setFundamentals] = useState<FundamentalsJson | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [paramsByPreset, setParamsByPreset] = useState<Record<string, PresetParams>>({})
  const [results, setResults] = useState<FilterResult[]>([])

  const presets = getExpertPresets()

  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) { setLoading(false); return }
      const [ind, fund] = await Promise.all([
        loadIndicators(u.trade_date),
        loadFundamentals(u.trade_date)
      ])
      setIndicators(ind)
      setFundamentals(fund ?? {})
      setLoading(false)
      if (presets.length > 0) setActiveId(presets[0].id)
    })
  }, [])

  const currentPreset = useMemo(
    () => activeId ? getPresetById(activeId) : null,
    [activeId]
  )

  useEffect(() => {
    if (!indicators || !fundamentals || !currentPreset) {
      setResults([])
      return
    }
    const params = paramsByPreset[currentPreset.id] ?? {}
    const out = runPreset(currentPreset, indicators, fundamentals, params)
    setResults(out)
  }, [indicators, fundamentals, currentPreset, paramsByPreset])

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <PresetSidebar presets={presets} activeId={activeId} onSelect={setActiveId} />
      <section className="flex-1 min-w-0">
        {currentPreset ? (
          <>
            <h2 className="text-lg font-bold mb-2">{currentPreset.name}</h2>
            <PresetDescription preset={currentPreset} />
            <ParamControls
              params={currentPreset.params}
              values={paramsByPreset[currentPreset.id] ?? {}}
              onChange={(next) => setParamsByPreset({ ...paramsByPreset, [currentPreset.id]: next })}
            />
            <div className="mt-4">
              <ResultTable results={results} loading={loading} />
            </div>
          </>
        ) : (
          <p>프리셋을 선택해 주세요.</p>
        )}
      </section>
    </div>
  )
}
```

### Update `src/app/[basePath]/screener/page.tsx`
```tsx
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ExpertScreener from './ExpertScreener'

export default function ScreenerPage() {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 min-h-[60vh]">
        <ExpertScreener />
      </main>
      <Footer />
    </>
  )
}
```

**주의**: Phase 5에서 모드 토글 기반 초보/전문가 분기 추가 예정. 지금은 전문가 전용.

- [ ] **type-check + build**
```bash
npm run type-check
npm run build
```
Expected: build 성공.

- [ ] **Commit**
```bash
git add src/app/[basePath]/screener/
git commit -m "feat(phase-4): wire ExpertScreener container into screener page"
```

---

## Task 20: Workprogress + 최종 검증

- [ ] **Step 1: 전체 테스트**
```bash
npm test
```
Expected: 모든 이전 테스트 + 새 프리셋 테스트 + filter 엔진 테스트 = 60+ PASS.

- [ ] **Step 2: Workprogress**
`Workprogress/Phase_4_2026-04-14.md` 작성 (Phase 3 템플릿 형식 따름).

- [ ] **Step 3: 커밋 + 사용자 확인 후 push**

---

## 🏁 Phase 4 완료 조건

- [ ] 12개 프리셋 모두 구현 + 각 2~3개 테스트
- [ ] filter 엔진 TDD (3 tests)
- [ ] dataLoader IndexedDB 캐싱
- [ ] 전문가 UI (사이드바/테이블/파라미터/설명)
- [ ] /screener 페이지 통합
- [ ] Vitest 60+ PASS, type-check clean, build 성공
- [ ] Workprogress 기록
- [ ] 사용자 확인 후 push + PR
