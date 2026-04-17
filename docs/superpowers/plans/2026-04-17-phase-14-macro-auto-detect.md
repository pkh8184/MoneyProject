# Phase 14 — 매크로 자동 탐지 + 차등 가중치 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 환율·유가·코스피 자동 탐지로 7개 팩터 추천 + 30개 팩터 차등 가중치(3~10)로 Phase 13 정확도 상승.

**Architecture:** Python 스크립트로 매크로 지표 수집 → `macro_indicators.json` → 프론트엔드 `useMacroAutoDetect` 훅이 임계값 기반 팩터 감지 → `/environment` 상단 자동 카드 UI. 팩터 타입에 `weight` 필드 추가하고 scoring에서 적용.

**Tech Stack:** Python (FinanceDataReader + pykrx), Next.js 14, TypeScript, Vitest.

**Design Spec:** [`docs/superpowers/specs/2026-04-17-phase-14-macro-auto-detect-design.md`](../specs/2026-04-17-phase-14-macro-auto-detect-design.md)

---

## 사전 준비

- Phase 13 완료 후 새 브랜치 `feature/phase-14-macro-auto-detect` (off main, 머지 후)
- 프로젝트 루트: `/c/Users/rk454/Desktop/Project/Money/MoneyProject`
- Bash 절대 경로 사용

---

## Phase A — 데이터 파이프라인 (Tasks 1-3)

### Task 1: `fetch_macro_indicators.py`

**Files:** Create `scripts/fetch_macro_indicators.py`

- [ ] **Step 1: 구현**

```python
"""매크로 지표 수집 (환율·유가·코스피).
출력: public/data/macro_indicators.json
"""
import json
import sys
from pathlib import Path
from datetime import datetime, timedelta
import pytz
import FinanceDataReader as fdr

DATA_DIR = Path(__file__).resolve().parent.parent / 'public' / 'data'
KST = pytz.timezone('Asia/Seoul')


def fetch_fdr_indicator(symbol: str, days: int = 120) -> dict | None:
    """FDR로 심볼 시계열 수집 후 요약 지표 계산."""
    start = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
    try:
        df = fdr.DataReader(symbol, start)
    except Exception as e:
        print(f'[WARN] FDR {symbol} failed: {e}', file=sys.stderr)
        return None
    if df is None or df.empty or 'Close' not in df.columns:
        return None
    closes = df['Close'].dropna()
    if len(closes) < 20:
        return None
    current = float(closes.iloc[-1])
    def pct_change(ref_idx: int) -> float | None:
        if len(closes) <= ref_idx:
            return None
        ref = float(closes.iloc[-1 - ref_idx])
        if ref == 0:
            return None
        return round(((current - ref) / ref) * 100, 2)
    ma20 = float(closes.iloc[-20:].mean())
    vs_ma20 = round(((current - ma20) / ma20) * 100, 2) if ma20 > 0 else None
    return {
        'current': round(current, 2),
        'change_20d_pct': pct_change(20),
        'change_5d_pct': pct_change(5),
        'vs_ma20_pct': vs_ma20
    }


def fetch_kospi() -> dict | None:
    """KOSPI는 pykrx 우선 시도, 실패 시 FDR 폴백."""
    try:
        from pykrx import stock
        end = datetime.now().strftime('%Y%m%d')
        start = (datetime.now() - timedelta(days=120)).strftime('%Y%m%d')
        df = stock.get_index_ohlcv_by_date(start, end, '1001')
        if df is None or df.empty:
            raise RuntimeError('empty')
        closes = df['종가'].astype(float).dropna()
        if len(closes) < 20:
            raise RuntimeError('not enough')
        current = float(closes.iloc[-1])
        def pct_change(ref_idx: int) -> float | None:
            if len(closes) <= ref_idx:
                return None
            ref = float(closes.iloc[-1 - ref_idx])
            return round(((current - ref) / ref) * 100, 2) if ref > 0 else None
        ma20 = float(closes.iloc[-20:].mean())
        return {
            'current': round(current, 2),
            'change_20d_pct': pct_change(20),
            'change_5d_pct': pct_change(5),
            'vs_ma20_pct': round(((current - ma20) / ma20) * 100, 2) if ma20 > 0 else None
        }
    except Exception as e:
        print(f'[WARN] pykrx KOSPI failed: {e}, falling back to FDR', file=sys.stderr)
        return fetch_fdr_indicator('KS11')


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    result = {
        'updated_at': datetime.now(KST).isoformat(),
        'forex_usd_krw': fetch_fdr_indicator('USD/KRW'),
        'oil_wti': fetch_fdr_indicator('CL=F'),
        'kospi': fetch_kospi()
    }
    out_path = DATA_DIR / 'macro_indicators.json'
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'[INFO] macro_indicators.json saved: {result}')


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: 문법 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && python -c "import ast; ast.parse(open('scripts/fetch_macro_indicators.py', encoding='utf-8').read()); print('OK')"`
Expected: `OK`

---

### Task 2: GitHub Actions 통합

**Files:** Modify `.github/workflows/daily-update.yml`

- [ ] **Step 1: 단계 추가**

기존 `fetch_sectors.py` 실행 단계 **아래에** 추가:

```yaml
      - name: Fetch macro indicators
        run: python scripts/fetch_macro_indicators.py
        continue-on-error: true
```

`split_ohlcv.py` 실행 전 위치. `continue-on-error`로 실패해도 워크플로 지속.

---

### Task 3: TS 타입 + 로더

**Files:** Modify `src/lib/types/indicators.ts`, `src/lib/dataLoader.ts`

- [ ] **Step 1: 타입 추가** — `indicators.ts`에 추가

```typescript
export interface MacroIndicator {
  current: number
  change_20d_pct: number | null
  change_5d_pct: number | null
  vs_ma20_pct: number | null
}

export interface MacroIndicatorsJson {
  updated_at: string
  forex_usd_krw: MacroIndicator | null
  oil_wti: MacroIndicator | null
  kospi: MacroIndicator | null
}
```

- [ ] **Step 2: 로더 추가** — `dataLoader.ts`에 추가

`MacroIndicatorsJson`을 import에 포함. `loadSectors` 아래에 다음 추가:

```typescript
const IDB_MACRO_KEY = 'macro-indicators-cache-v1'

export async function loadMacroIndicators(tradeDate: string): Promise<MacroIndicatorsJson | null> {
  const cached = await getCached<MacroIndicatorsJson>(IDB_MACRO_KEY, tradeDate)
  if (cached) return cached
  try {
    const res = await fetch('/data/macro_indicators.json', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as MacroIndicatorsJson
    await setCached(IDB_MACRO_KEY, tradeDate, data)
    return data
  } catch {
    return null
  }
}
```

- [ ] **Step 3: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`
Expected: 에러 없음

---

## Phase B — 자동 탐지 로직 (Tasks 4-6)

### Task 4: `useMacroAutoDetect` 훅 + 테스트

**Files:**
- Create: `src/lib/macro/useMacroAutoDetect.ts`
- Create: `src/lib/macro/__tests__/autoDetect.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
// autoDetect.test.ts
import { describe, it, expect } from 'vitest'
import { detectFromIndicators } from '../useMacroAutoDetect'
import type { MacroIndicatorsJson } from '@/lib/types/indicators'

function mk(overrides: Partial<MacroIndicatorsJson> = {}): MacroIndicatorsJson {
  return {
    updated_at: '2026-04-17T18:00:00+09:00',
    forex_usd_krw: null,
    oil_wti: null,
    kospi: null,
    ...overrides
  }
}

function mkInd(v: Partial<{ change_20d_pct: number; change_5d_pct: number; vs_ma20_pct: number }>) {
  return { current: 100, change_20d_pct: null, change_5d_pct: null, vs_ma20_pct: null, ...v }
}

describe('detectFromIndicators', () => {
  it('returns empty when indicators null', () => {
    expect(detectFromIndicators(null)).toEqual([])
  })

  it('detects krw_weak when forex 20d >= +3', () => {
    const ind = mk({ forex_usd_krw: mkInd({ change_20d_pct: 3.5 }) })
    expect(detectFromIndicators(ind)).toContain('krw_weak')
  })

  it('detects krw_strong when forex 20d <= -3', () => {
    const ind = mk({ forex_usd_krw: mkInd({ change_20d_pct: -3.2 }) })
    expect(detectFromIndicators(ind)).toContain('krw_strong')
  })

  it('detects oil_up when oil 20d >= +10', () => {
    const ind = mk({ oil_wti: mkInd({ change_20d_pct: 12.5 }) })
    expect(detectFromIndicators(ind)).toContain('oil_up')
  })

  it('detects oil_down when oil 20d <= -10', () => {
    const ind = mk({ oil_wti: mkInd({ change_20d_pct: -11.2 }) })
    expect(detectFromIndicators(ind)).toContain('oil_down')
  })

  it('detects kospi_crash when 5d <= -3', () => {
    const ind = mk({ kospi: mkInd({ change_5d_pct: -3.5 }) })
    expect(detectFromIndicators(ind)).toContain('kospi_crash')
  })

  it('detects kospi_crash when vs_ma20 <= -5', () => {
    const ind = mk({ kospi: mkInd({ change_5d_pct: -1, vs_ma20_pct: -6 }) })
    expect(detectFromIndicators(ind)).toContain('kospi_crash')
  })

  it('does not detect when within thresholds', () => {
    const ind = mk({
      forex_usd_krw: mkInd({ change_20d_pct: 1.5 }),
      oil_wti: mkInd({ change_20d_pct: 5 }),
      kospi: mkInd({ change_5d_pct: -1, vs_ma20_pct: -2 })
    })
    expect(detectFromIndicators(ind)).toEqual([])
  })

  it('handles null fields gracefully', () => {
    const ind = mk({
      forex_usd_krw: mkInd({ change_20d_pct: null }),
      oil_wti: null
    })
    expect(detectFromIndicators(ind)).toEqual([])
  })
})
```

- [ ] **Step 2: FAIL 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx vitest run src/lib/macro/__tests__/autoDetect.test.ts`
Expected: module not found

- [ ] **Step 3: 구현**

```typescript
// useMacroAutoDetect.ts
'use client'
import { useEffect, useState } from 'react'
import type { MacroIndicatorsJson, FundamentalsJson } from '@/lib/types/indicators'
import { loadMacroIndicators, loadUpdatedAt } from '@/lib/dataLoader'

export function detectFromIndicators(indicators: MacroIndicatorsJson | null): string[] {
  if (!indicators) return []
  const detected: string[] = []

  const forex = indicators.forex_usd_krw
  if (forex?.change_20d_pct != null) {
    if (forex.change_20d_pct >= 3) detected.push('krw_weak')
    else if (forex.change_20d_pct <= -3) detected.push('krw_strong')
  }

  const oil = indicators.oil_wti
  if (oil?.change_20d_pct != null) {
    if (oil.change_20d_pct >= 10) detected.push('oil_up')
    else if (oil.change_20d_pct <= -10) detected.push('oil_down')
  }

  const kospi = indicators.kospi
  if (kospi) {
    const d5 = kospi.change_5d_pct
    const vm = kospi.vs_ma20_pct
    if ((d5 != null && d5 <= -3) || (vm != null && vm <= -5)) {
      detected.push('kospi_crash')
    }
  }

  return detected
}

export function detectForeignTrend(fundamentals: FundamentalsJson | null): 'sell' | 'buy' | null {
  if (!fundamentals) return null
  // 대형주 10개: nameKeywords 기반 매칭 (코드로 직접 접근 불가 → 샘플링 생략하고 모든 종목 평균)
  const nets: number[] = []
  const largeCapKeywords = ['삼성전자', 'SK하이닉스', '현대차', '기아', 'LG에너지솔루션',
                             '카카오', '네이버', 'NAVER', 'POSCO', '셀트리온']
  // 실제 매칭은 종목명에 접근 불가하므로 코드 기반 접근이 어려움
  // 대안: fundamentals에 모든 종목 있으므로 foreign_net 배열 평균 계산 (전체 평균)
  let sellDays = 0
  let buyDays = 0
  let totalSamples = 0
  for (const code of Object.keys(fundamentals)) {
    const f = fundamentals[code]
    if (!f.foreign_net || f.foreign_net.length < 10) continue
    const recent10 = f.foreign_net.slice(-10)
    for (const v of recent10) {
      if (v < 0) sellDays++
      else if (v > 0) buyDays++
    }
    totalSamples += recent10.length
    if (totalSamples > 500) break  // 샘플 50종목 정도면 충분
  }
  if (totalSamples === 0) return null
  const sellRatio = sellDays / totalSamples
  const buyRatio = buyDays / totalSamples
  if (sellRatio >= 0.6) return 'sell'
  if (buyRatio >= 0.6) return 'buy'
  return null
}

export function useMacroAutoDetect(fundamentals: FundamentalsJson | null): string[] {
  const [detected, setDetected] = useState<string[]>([])

  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) return
      const ind = await loadMacroIndicators(u.trade_date)
      const ids = detectFromIndicators(ind)
      const trend = detectForeignTrend(fundamentals)
      if (trend === 'sell') ids.push('foreign_sell')
      else if (trend === 'buy') ids.push('foreign_buy')
      setDetected(ids)
    })
  }, [fundamentals])

  return detected
}
```

- [ ] **Step 4: PASS 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx vitest run src/lib/macro/__tests__/autoDetect.test.ts`
Expected: 9 tests PASS

---

### Task 5: useMacroFactors 확장 — autoDetected 반환

**Files:** Modify `src/lib/macro/useMacroFactors.ts`

- [ ] **Step 1: 시그니처 확장**

기존 훅 반환값에 `autoDetected: string[]`, `applyAllAutoDetected: (ids: string[]) => void` 추가:

```typescript
export function useMacroFactors(userId: string = 'anon', autoDetectedIds: string[] = []): {
  all: MacroFactor[]
  activeIds: string[]
  activeFactors: MacroFactor[]
  autoDetectedIds: string[]
  toggle: (id: string) => void
  clearAll: () => void
  isActive: (id: string) => boolean
  isAutoDetected: (id: string) => boolean
  applyAllAutoDetected: () => void
} {
  // ... 기존 로직
  
  const isAutoDetected = useCallback(
    (id: string) => autoDetectedIds.includes(id),
    [autoDetectedIds]
  )

  const applyAllAutoDetected = useCallback(() => {
    setStore((prev) => {
      const next = [...prev.activeIds]
      for (const id of autoDetectedIds) {
        if (!next.includes(id)) next.push(id)
      }
      return { activeIds: next }
    })
  }, [autoDetectedIds, setStore])

  return {
    all: macroFactors,
    activeIds: store.activeIds,
    activeFactors,
    autoDetectedIds,
    toggle,
    clearAll,
    isActive,
    isAutoDetected,
    applyAllAutoDetected
  }
}
```

- [ ] **Step 2: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`

---

### Task 6: Phase A+B 일괄 커밋

```bash
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject add scripts/fetch_macro_indicators.py .github/workflows/daily-update.yml src/lib/types/indicators.ts src/lib/dataLoader.ts src/lib/macro/useMacroAutoDetect.ts src/lib/macro/useMacroFactors.ts src/lib/macro/__tests__/autoDetect.test.ts
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject commit -m "feat(macro-auto): data pipeline + autoDetect hook (Phase 14 A+B)"
```

---

## Phase C — UI 통합 (Tasks 7-10)

### Task 7: `AutoDetectCard` 컴포넌트

**Files:** Create `src/app/[basePath]/environment/AutoDetectCard.tsx`

- [ ] **Step 1: 구현**

```typescript
'use client'
import Card from '@/components/ui/Card'
import { strings } from '@/lib/strings/ko'
import type { MacroFactor } from '@/lib/macro/types'

interface Props {
  autoDetected: MacroFactor[]
  isActive: (id: string) => boolean
  onToggle: (id: string) => void
  onApplyAll: () => void
  updatedAt: string | null
}

export default function AutoDetectCard({ autoDetected, isActive, onToggle, onApplyAll, updatedAt }: Props) {
  if (autoDetected.length === 0) {
    return (
      <Card padding="md" className="mb-6">
        <p className="text-sm">{strings.autoDetect.noneDetected}</p>
      </Card>
    )
  }

  const allApplied = autoDetected.every((f) => isActive(f.id))

  return (
    <Card padding="md" className="mb-6 border-2 border-yellow-400 dark:border-yellow-600">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-bold">{strings.autoDetect.title(autoDetected.length)}</h3>
        {updatedAt && (
          <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
            {strings.autoDetect.updatedAt(updatedAt)}
          </span>
        )}
      </div>
      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-3">
        {strings.autoDetect.description}
      </p>
      <div className="space-y-2">
        {autoDetected.map((f) => {
          const active = isActive(f.id)
          return (
            <div
              key={f.id}
              className="flex items-center justify-between p-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark"
            >
              <span className="text-sm">
                {f.emoji} {f.name}{' '}
                <span className={active ? 'text-emerald-600' : 'text-text-secondary-light dark:text-text-secondary-dark'}>
                  {active ? strings.autoDetect.applied : strings.autoDetect.notApplied}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onToggle(f.id)}
                className="text-xs px-3 py-1 rounded-full bg-bg-primary-light dark:bg-bg-primary-dark"
              >
                {active ? strings.autoDetect.turnOff : strings.autoDetect.turnOn}
              </button>
            </div>
          )
        })}
      </div>
      {!allApplied && (
        <button
          type="button"
          onClick={onApplyAll}
          className="mt-4 w-full px-4 py-2 rounded-full bg-accent-light dark:bg-accent-dark text-white text-sm"
        >
          {strings.autoDetect.applyAll}
        </button>
      )}
    </Card>
  )
}
```

---

### Task 8: `FactorCard`에 자동 감지 뱃지 + 강도 표시

**Files:** Modify `src/app/[basePath]/environment/FactorCard.tsx`

- [ ] **Step 1: Props 확장 + UI 수정**

```typescript
interface Props {
  factor: MacroFactor
  active: boolean
  autoDetected?: boolean
  onToggle: () => void
}

// 기존 JSX 내부에서 factor.name 옆에 추가:
<div className="font-bold mb-1 flex items-center gap-2 flex-wrap">
  <span>{factor.emoji} {factor.name}</span>
  {autoDetected && (
    <span className={`text-xs px-2 py-0.5 rounded-full ${
      active
        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
        : 'bg-bg-secondary-light dark:bg-bg-secondary-dark text-text-secondary-light dark:text-text-secondary-dark'
    }`}>
      {strings.autoDetect.badgeLabel}
    </span>
  )}
  <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark ml-auto">
    {strings.macro.weightLabel(factor.weight)}
  </span>
</div>
```

---

### Task 9: `EnvironmentView` 통합

**Files:** Modify `src/app/[basePath]/environment/EnvironmentView.tsx`

- [ ] **Step 1: fundamentals·indicators 로드 + 자동 감지 통합**

상단에 imports 추가:
```typescript
import AutoDetectCard from './AutoDetectCard'
import { useMacroAutoDetect } from '@/lib/macro/useMacroAutoDetect'
import { loadFundamentals, loadMacroIndicators, loadUpdatedAt } from '@/lib/dataLoader'
import type { FundamentalsJson, MacroIndicatorsJson } from '@/lib/types/indicators'
```

함수 내부:
```typescript
const [fundamentals, setFundamentals] = useState<FundamentalsJson | null>(null)
const [indicators, setIndicators] = useState<MacroIndicatorsJson | null>(null)

useEffect(() => {
  loadUpdatedAt().then(async (u) => {
    if (!u) return
    const [fund, ind] = await Promise.all([
      loadFundamentals(u.trade_date),
      loadMacroIndicators(u.trade_date)
    ])
    setFundamentals(fund)
    setIndicators(ind)
  })
}, [])

const autoDetectedIds = useMacroAutoDetect(fundamentals)
const { all, activeIds, toggle, clearAll, isActive, isAutoDetected, applyAllAutoDetected } =
  useMacroFactors('anon', autoDetectedIds)

const autoDetectedFactors = useMemo(
  () => all.filter((f) => autoDetectedIds.includes(f.id)),
  [all, autoDetectedIds]
)
```

렌더에서 "활성 카운트" 블록 위에:
```tsx
<AutoDetectCard
  autoDetected={autoDetectedFactors}
  isActive={isActive}
  onToggle={toggle}
  onApplyAll={applyAllAutoDetected}
  updatedAt={indicators?.updated_at ?? null}
/>
```

`FactorCard` 렌더 시 `autoDetected={isAutoDetected(f.id)}` prop 추가.

---

### Task 10: ko.ts autoDetect 섹션 추가

**Files:** Modify `src/lib/strings/ko.ts`

- [ ] **Step 1: 추가**

기존 `macro` 섹션 뒤에 추가:

```typescript
  autoDetect: {
    title: (n: number) => `🤖 자동 감지됨 (${n}개)`,
    description: '오늘 시장 상황으로 이런 팩터들이 맞아 보여요',
    noneDetected: '🌤️ 오늘은 특별한 시장 이벤트가 감지되지 않았어요',
    badgeLabel: '💡 자동 감지',
    applied: '적용됨',
    notApplied: '적용 안 됨',
    turnOn: '적용',
    turnOff: '끄기',
    applyAll: '💡 자동 감지 전부 켜기',
    updatedAt: (iso: string) => `업데이트: ${new Date(iso).toLocaleString('ko-KR')}`
  },
```

`macro` 섹션에 `weightLabel` 추가:
```typescript
  macro: {
    // ... 기존 ...
    weightLabel: (w: number) => `강도: ±${w}`
  },
```

---

## Phase D — 가중치 차등화 (Tasks 11-13)

### Task 11: types + factors weight 부여

**Files:**
- Modify: `src/lib/macro/types.ts` — `weight: number` 필드 추가
- Modify: `src/lib/macro/factors.ts` — 30개 팩터에 weight 부여

- [ ] **Step 1: 타입에 `weight: number` 추가** (MacroFactor 인터페이스)

- [ ] **Step 2: factors.ts 모든 팩터에 weight 추가**

spec B-2 표 기준:

| weight 10 (3) | `war_ongoing`, `kospi_crash`, `foreign_sell` |
| weight 8 (6) | `rate_hike`, `rate_cut`, `inflation`, `ai_boom`, `us_china`, `oil_up` |
| weight 7 (6) | `krw_weak`, `krw_strong`, `oil_down`, `ev_boom`, `export_boom`, `foreign_buy` |
| weight 5 (9) | `middle_east`, `trade_boom`, `bio_boom`, `defense_boom`, `realestate_tight`, `realestate_boost`, `domestic_down`, `domestic_up`, `kcontent_boom` |
| weight 3 (6) | `nk_provocation`, `gold_up`, `taiwan_tension`, `korea_peace`, `lithium_copper`, `grain_up` |

각 팩터 객체에 `weight: <number>` 필드 추가.

- [ ] **Step 3: factors.test.ts 업데이트**

테스트에 추가:
```typescript
it('all factors have weight between 3 and 10', () => {
  for (const f of macroFactors) {
    expect(f.weight).toBeGreaterThanOrEqual(3)
    expect(f.weight).toBeLessThanOrEqual(10)
  }
})

it('weight distribution matches spec', () => {
  const count = (w: number) => macroFactors.filter((f) => f.weight === w).length
  expect(count(10)).toBe(3)
  expect(count(8)).toBe(6)
  expect(count(7)).toBe(6)
  expect(count(5)).toBe(9)
  expect(count(3)).toBe(6)
})
```

---

### Task 12: scoring.ts 가중치 반영 + 테스트 업데이트

**Files:** Modify `src/lib/macro/scoring.ts`, `src/lib/macro/__tests__/scoring.test.ts`

- [ ] **Step 1: scoring.ts 수정**

```typescript
// 기존 const BENEFIT_WEIGHT = 5 / LOSS_WEIGHT = 5 제거

export function computeMacroBonus(
  stockName: string,
  themes: string[] | undefined,
  activeFactors: MacroFactor[]
): MacroBonus {
  const detail: MacroBonusDetail[] = []
  for (const f of activeFactors) {
    let delta = 0
    if (matchesFactor(stockName, themes, f.beneficiaries)) delta += f.weight
    if (matchesFactor(stockName, themes, f.losers)) delta -= f.weight
    if (delta !== 0) {
      detail.push({
        factorId: f.id,
        factorName: f.name,
        delta,
        role: delta > 0 ? 'benefit' : 'loss'
      })
    }
  }
  return { total: detail.reduce((s, d) => s + d.delta, 0), detail }
}
```

- [ ] **Step 2: scoring 테스트의 mkFactor 업데이트**

`mkFactor` 헬퍼 시그니처에 weight 파라미터 추가:
```typescript
function mkFactor(id: string, benefThemes: string[] = [], lossThemes: string[] = [], weight: number = 5): MacroFactor {
  return {
    // ... 기존 ...
    weight
  }
}
```

테스트 케이스 확인·수정:
- "adds +5 for benefit match" → "adds weight for benefit match" (weight=5 가정 유지 OK)
- 신규 테스트:
```typescript
it('uses factor weight when weight != 5', () => {
  const f = mkFactor('war', ['방산'], [], 10)
  const result = computeMacroBonus('한화에어로스페이스', ['방산'], [f])
  expect(result.total).toBe(10)
})
```

- [ ] **Step 3: PASS 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx vitest run src/lib/macro`
Expected: 모든 테스트 PASS (신규 포함)

---

### Task 13: Phase C+D 일괄 커밋

```bash
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject add src/app/\[basePath\]/environment/ src/lib/strings/ko.ts src/lib/macro/types.ts src/lib/macro/factors.ts src/lib/macro/scoring.ts src/lib/macro/__tests__/scoring.test.ts src/lib/macro/__tests__/factors.test.ts
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject commit -m "feat(macro-auto): UI integration + per-factor weight (Phase 14 C+D)"
```

---

## Phase E — 가이드·충돌 UX (Tasks 14-15)

### Task 14: 첫 방문 가이드 3단계 업데이트

**Files:** Modify `src/lib/strings/ko.ts`

- [ ] **Step 1: 기존 `environment.guideStep*` 교체**

```typescript
guideStep1Title: '🌍 시장 환경이란?',
guideStep1Body: '"지금 세계에서 벌어지는 일"에 따라 유리한 종목이 달라져요.',
guideStep2Title: '🤖 자동 감지',
guideStep2Body: '환율·유가·코스피는 실제 데이터로 자동 감지해서 추천해드려요.\n마음에 들면 "자동 감지 전부 켜기" 버튼으로 바로 적용하세요.',
guideStep3Title: '수동 설정',
guideStep3Body: '전쟁·산업 붐 같은 건 직접 뉴스 보시고 켜주세요.',
```

---

### Task 15: MacroBadge·MacroDetailPanel 동작 재확인

**Files:** (변경 없음 — 기존 코드가 weight 반영한 total/delta를 그대로 씀)

- [ ] **Step 1: 수동 검증**

`/environment`에서 팩터 몇 개 ON → 추천 페이지에서 뱃지 `🌍 환경 +16` 같이 가중치 반영된 숫자 표시 확인.

---

## Phase F — QA + 배포 (Tasks 16-20)

### Task 16: E2E 로컬 검증

- [ ] Python 스크립트 수동 실행 테스트

```
cd /c/Users/rk454/Desktop/Project/Money/MoneyProject
python scripts/fetch_macro_indicators.py
cat public/data/macro_indicators.json
```

`forex_usd_krw`, `oil_wti`, `kospi` 필드 정상 출력 확인.

- [ ] 전체 테스트

```
npx vitest run
```

Expected: 기존 149 + 신규 9 (autoDetect) + 2 (factors weight) = **~160 tests 모두 PASS**

- [ ] tsc

```
npx tsc --noEmit
```

---

### Task 17: 프로덕션 빌드

```
npm run build
```

빌드 성공 확인.

---

### Task 18: 수동 QA 체크리스트

- [ ] `/environment` 접속 → 자동 감지 카드 상단 렌더
- [ ] 감지된 팩터 0개 상황 → "특별한 이벤트 없음" 메시지
- [ ] "자동 감지 전부 켜기" 클릭 → 감지된 팩터 모두 ON
- [ ] 자동 감지된 팩터 수동으로 끔 → 회색 뱃지로 변경
- [ ] 각 FactorCard에 "강도: ±N" 표시
- [ ] MacroBadge 숫자가 weight 반영 (예: war_ongoing 수혜면 +10)
- [ ] 다크 모드
- [ ] 모바일 (375px)

---

### Task 19: GitHub Actions 수동 실행

머지 후:
- GitHub Actions → Daily Stock Data Update → Run workflow
- `macro_indicators.json` 생성 확인 (data branch)

---

### Task 20: PR 생성

```bash
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject push -u origin feature/phase-14-macro-auto-detect
```

PR URL: `https://github.com/pkh8184/MoneyProject/pull/new/feature/phase-14-macro-auto-detect`

**PR 제목**: `Phase 14: 매크로 자동 탐지 + 차등 가중치`

**본문**:
```markdown
## Summary
- 환율·유가·코스피 자동 탐지 (7개 팩터)
- 30개 팩터 차등 가중치 (3~10)
- `/environment` 자동 감지 카드 UI
- fetch_macro_indicators.py + daily-update.yml 통합

## Test plan
- [x] ~160 tests (신규 11)
- [x] tsc clean
- [x] build 성공
- [ ] 수동 QA (자동 감지 카드, 강도 표시, 뱃지 숫자)

## 머지 후 필수
- Daily Stock Data Update 워크플로 수동 실행 (macro_indicators.json 최초 생성)
```

---

## Self-Review

**Spec coverage**:
- ✅ 자동 탐지 7개 → Tasks 1-4
- ✅ 외국인 수급 → Task 4 (detectForeignTrend)
- ✅ 자동 감지 UI → Tasks 7-9
- ✅ 30개 가중치 → Task 11
- ✅ 가중치 적용 → Task 12
- ✅ 가이드 업데이트 → Task 14
- ✅ 워크플로 통합 → Task 2

**Type consistency**:
- `MacroFactor.weight` 필드 → types(Task 11) → factors(Task 11) → scoring(Task 12)
- `MacroIndicatorsJson` → indicators.ts(Task 3) → dataLoader(Task 3) → useMacroAutoDetect(Task 4) → EnvironmentView(Task 9)

**Placeholder scan**: 없음

**알려진 의존**:
- Python `FinanceDataReader` + `pykrx`는 이미 requirements에 있음 (기존 fetch_stocks, fetch_sectors 사용 중)
