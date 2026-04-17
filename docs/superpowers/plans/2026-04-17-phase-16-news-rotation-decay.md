# Phase 16 — 섹터 로테이션 + 시간 감쇠 + 뉴스 연동 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 섹터 로테이션 가산, 자동 탐지 팩터의 시간 감쇠, 뉴스 RSS 기반 자동 팩터 탐지를 구현하여 Phase 15의 정확도(82~92%)를 86~95%로 상승시킨다. DART 연동은 API 키 없음으로 제외.

**Architecture:** 3개 Python 스크립트(섹터 로테이션 계산, 뉴스 RSS 수집)로 JSON 생성 → TS 로더/훅 통합. scoring.ts는 기존 매크로 가산에 decay factor + sector rotation 레이어 추가. 모든 작업 하나의 PR로 통합.

**Tech Stack:** Python (pandas, feedparser), TypeScript, Next.js 14, Vitest.

**Design Spec:** [`docs/superpowers/specs/2026-04-17-phase-16-news-rotation-decay-design.md`](../specs/2026-04-17-phase-16-news-rotation-decay-design.md)

---

## 사전 준비

- 브랜치: 현재 `feature/phase-15-backtest-weights`에 이어 진행 (Phase 15+16 통합 PR)
- 프로젝트 루트: `/c/Users/rk454/Desktop/Project/Money/MoneyProject`
- Bash 절대 경로
- Phase 14/15 인프라 재사용: `useMacroFactors`, `useMacroAutoDetect`, `computeMacroBonus`, `enrichWithMacro`
- DART 스크립트·UI 배지 스킵 (API 키 미보유)

---

## Phase 16a — 섹터 로테이션 (Tasks 1-8)

### Task 1: `calculate_sector_rotation.py`

**Files:** Create `scripts/calculate_sector_rotation.py`

- [ ] **Step 1: 구현**

```python
"""섹터별 최근 30일 평균 수익률 계산.
입력: sectors.json + ohlcv/{code}.json
출력: public/data/sector_rotation.json
"""
import json
import sys
from pathlib import Path
from datetime import datetime
import pytz

DATA_DIR = Path(__file__).resolve().parent.parent / 'public' / 'data'
KST = pytz.timezone('Asia/Seoul')
PERIOD_DAYS = 30


def load_json(name: str):
    path = DATA_DIR / name
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding='utf-8'))


def load_ohlcv(code: str) -> dict | None:
    path = DATA_DIR / 'ohlcv' / f'{code}.json'
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception:
        return None


def compute_return_30d(oh: dict) -> float | None:
    closes = oh.get('close') or []
    if len(closes) < PERIOD_DAYS + 1:
        return None
    cur = closes[-1]
    ref = closes[-PERIOD_DAYS - 1]
    if not cur or not ref or ref <= 0:
        return None
    return ((cur - ref) / ref) * 100


def main():
    sectors = load_json('sectors.json')
    stocks = load_json('stocks.json')
    if not sectors or not stocks:
        print('[ERROR] sectors.json or stocks.json missing', file=sys.stderr)
        sys.exit(1)

    # theme → [returns]
    theme_returns: dict[str, list[float]] = {}
    for s in stocks.get('stocks', []):
        code = s['code']
        themes = (sectors.get(code) or {}).get('themes') or []
        if not themes:
            continue
        oh = load_ohlcv(code)
        if not oh:
            continue
        r = compute_return_30d(oh)
        if r is None:
            continue
        for t in themes:
            theme_returns.setdefault(t, []).append(r)

    # 평균 계산
    rows = []
    for theme, rets in theme_returns.items():
        if len(rets) < 3:  # 최소 3종목
            continue
        avg = sum(rets) / len(rets)
        rows.append({
            'theme': theme,
            'avg_return_pct': round(avg, 2),
            'sample_stocks': len(rets)
        })

    # 정렬 후 rank 부여
    rows.sort(key=lambda x: -x['avg_return_pct'])
    for i, r in enumerate(rows):
        if r['avg_return_pct'] >= 5.0 or i < 3:
            r['rank'] = 'strong'
        elif r['avg_return_pct'] <= -5.0 or i >= len(rows) - 3:
            r['rank'] = 'weak'
        else:
            r['rank'] = 'neutral'

    out = {
        'updated_at': datetime.now(KST).isoformat(),
        'period_days': PERIOD_DAYS,
        'sectors': rows
    }
    (DATA_DIR / 'sector_rotation.json').write_text(
        json.dumps(out, ensure_ascii=False), encoding='utf-8'
    )
    strong = [r['theme'] for r in rows if r['rank'] == 'strong']
    weak = [r['theme'] for r in rows if r['rank'] == 'weak']
    print(f'[INFO] sector_rotation.json saved: strong={strong}, weak={weak}')


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: 문법 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && python -c "import ast; ast.parse(open('scripts/calculate_sector_rotation.py', encoding='utf-8').read()); print('OK')"`
Expected: `OK`

---

### Task 2: TS 타입 + 로더

**Files:**
- Modify: `src/lib/types/indicators.ts`
- Modify: `src/lib/dataLoader.ts`

- [ ] **Step 1: `indicators.ts`에 타입 추가**

```typescript
export interface SectorRotationEntry {
  theme: string
  avg_return_pct: number
  sample_stocks: number
  rank: 'strong' | 'weak' | 'neutral'
}

export interface SectorRotationJson {
  updated_at: string
  period_days: number
  sectors: SectorRotationEntry[]
}
```

- [ ] **Step 2: `dataLoader.ts` 로더 추가**

imports에 `SectorRotationJson` 추가.
`loadMacroIndicators` 다음에:

```typescript
const IDB_SECTOR_ROT_KEY = 'sector-rotation-cache-v1'

export async function loadSectorRotation(tradeDate: string): Promise<SectorRotationJson | null> {
  const cached = await getCached<SectorRotationJson>(IDB_SECTOR_ROT_KEY, tradeDate)
  if (cached) return cached
  try {
    const res = await fetch('/data/sector_rotation.json', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as SectorRotationJson
    await setCached(IDB_SECTOR_ROT_KEY, tradeDate, data)
    return data
  } catch {
    return null
  }
}
```

- [ ] **Step 3: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`

---

### Task 3: `sectorRotation.ts` 함수 + 테스트

**Files:**
- Create: `src/lib/macro/sectorRotation.ts`
- Create: `src/lib/macro/__tests__/sectorRotation.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
import { describe, it, expect } from 'vitest'
import { computeSectorRotationBonus } from '../sectorRotation'
import type { SectorRotationJson } from '@/lib/types/indicators'

function mkRotation(sectors: { theme: string; rank: 'strong' | 'weak' | 'neutral' }[]): SectorRotationJson {
  return {
    updated_at: '2026-04-17T18:00:00+09:00',
    period_days: 30,
    sectors: sectors.map((s) => ({ ...s, avg_return_pct: 0, sample_stocks: 10 }))
  }
}

describe('computeSectorRotationBonus', () => {
  it('returns 0 when no themes', () => {
    const r = computeSectorRotationBonus(undefined, mkRotation([]))
    expect(r.sectorRotationDelta).toBe(0)
  })

  it('returns 0 when no rotation data', () => {
    const r = computeSectorRotationBonus(['반도체'], null)
    expect(r.sectorRotationDelta).toBe(0)
  })

  it('returns +3 for strong sector match', () => {
    const rot = mkRotation([{ theme: '반도체', rank: 'strong' }])
    const r = computeSectorRotationBonus(['반도체'], rot)
    expect(r.sectorRotationDelta).toBe(3)
    expect(r.rank).toBe('strong')
    expect(r.activeSector).toBe('반도체')
  })

  it('returns -3 for weak sector match', () => {
    const rot = mkRotation([{ theme: '바이오', rank: 'weak' }])
    const r = computeSectorRotationBonus(['바이오'], rot)
    expect(r.sectorRotationDelta).toBe(-3)
    expect(r.rank).toBe('weak')
  })

  it('returns 0 for neutral', () => {
    const rot = mkRotation([{ theme: '금융', rank: 'neutral' }])
    const r = computeSectorRotationBonus(['금융'], rot)
    expect(r.sectorRotationDelta).toBe(0)
    expect(r.rank).toBe('neutral')
  })

  it('picks first matching theme', () => {
    const rot = mkRotation([
      { theme: 'AI', rank: 'strong' },
      { theme: '방산', rank: 'weak' }
    ])
    const r = computeSectorRotationBonus(['AI', '방산'], rot)
    expect(r.sectorRotationDelta).toBe(3)
    expect(r.activeSector).toBe('AI')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx vitest run src/lib/macro/__tests__/sectorRotation.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 구현**

```typescript
// src/lib/macro/sectorRotation.ts
import type { SectorRotationJson } from '@/lib/types/indicators'

export interface SectorRotationBonus {
  sectorRotationDelta: number
  activeSector: string | null
  rank: 'strong' | 'weak' | 'neutral' | null
}

export function computeSectorRotationBonus(
  themes: string[] | undefined,
  rotation: SectorRotationJson | null
): SectorRotationBonus {
  if (!themes || !rotation) return { sectorRotationDelta: 0, activeSector: null, rank: null }
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

- [ ] **Step 4: PASS 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx vitest run src/lib/macro/__tests__/sectorRotation.test.ts`
Expected: PASS 6 tests

---

### Task 4: `filter.ts` 섹터 로테이션 통합

**Files:** Modify `src/lib/filter.ts`

- [ ] **Step 1: 전체 파일 교체**

```typescript
import type { Preset, PresetParams } from './presets/types'
import type { IndicatorsJson, FundamentalsJson, SectorsJson, StockIndicators, SectorRotationJson } from '@/lib/types/indicators'
import type { MacroFactor, MacroBonus } from './macro/types'
import { computeMacroBonus } from './macro/scoring'
import { computeSectorRotationBonus, type SectorRotationBonus } from './macro/sectorRotation'

export interface FilterResult {
  code: string
  name: string
  market: string
  price: number | null
  volume: number | null
  rsi: number | null
  score: number
  macroBonus?: MacroBonus
  sectorRotationBonus?: SectorRotationBonus
  finalScore?: number
}

const MAX_RESULTS = 100

export function runPreset(
  preset: Preset,
  indicators: IndicatorsJson | null | undefined,
  fundamentals: FundamentalsJson | null | undefined,
  params: PresetParams
): FilterResult[] {
  if (!indicators || typeof indicators !== 'object') return []
  const fundMap = fundamentals && typeof fundamentals === 'object' ? fundamentals : {}
  const results: FilterResult[] = []

  for (const [code, value] of Object.entries(indicators)) {
    if (code === 'meta') continue
    const stock = value as StockIndicators
    if (!stock || typeof stock !== 'object' || !Array.isArray(stock.close)) continue
    const fundamental = fundMap[code]
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
      // skip
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, MAX_RESULTS)
}

export function enrichWithMacro(
  results: FilterResult[],
  sectors: SectorsJson | null | undefined,
  activeFactors: MacroFactor[],
  rotation?: SectorRotationJson | null
): FilterResult[] {
  const hasFactors = activeFactors.length > 0
  const hasRotation = !!rotation
  if (!hasFactors && !hasRotation) return results
  const enriched = results.map((r) => {
    const themes = sectors?.[r.code]?.themes
    const bonus = hasFactors
      ? computeMacroBonus(r.name, themes, activeFactors)
      : undefined
    const rotationBonus = hasRotation
      ? computeSectorRotationBonus(themes, rotation!)
      : undefined
    const total = (bonus?.total ?? 0) + (rotationBonus?.sectorRotationDelta ?? 0)
    return {
      ...r,
      macroBonus: bonus,
      sectorRotationBonus: rotationBonus,
      finalScore: r.score + total
    }
  })
  enriched.sort((a, b) => (b.finalScore ?? b.score) - (a.finalScore ?? a.score))
  return enriched
}
```

- [ ] **Step 2: 빌드 + 기존 테스트 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`
Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx vitest run`
Expected: 기존 + 신규 6 = 167 tests PASS

---

### Task 5: `SectorRotationCard` 컴포넌트

**Files:**
- Create: `src/components/macro/SectorRotationCard.tsx`
- Modify: `src/lib/strings/ko.ts`

- [ ] **Step 1: 문자열 추가** — ko.ts `macro` 섹션 안에 추가:

```typescript
rotationTitle: '⚡ 오늘의 섹터 흐름 (최근 30일)',
rotationStrong: '🔥 강세',
rotationWeak: '❄️ 약세',
rotationNeutral: '보통',
rotationNoData: '섹터 데이터 준비 중이에요',
rotationBadge: (delta: number) => `⚡ 섹터 ${delta > 0 ? '+' : ''}${delta}`,
rotationRowPct: (pct: number) => `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`,
```

- [ ] **Step 2: 컴포넌트 구현**

```typescript
'use client'
import Card from '@/components/ui/Card'
import { strings } from '@/lib/strings/ko'
import type { SectorRotationJson } from '@/lib/types/indicators'

interface Props { rotation: SectorRotationJson | null }

export default function SectorRotationCard({ rotation }: Props) {
  if (!rotation || rotation.sectors.length === 0) {
    return (
      <Card padding="md" className="mb-6">
        <p className="text-sm">{strings.macro.rotationNoData}</p>
      </Card>
    )
  }

  const strong = rotation.sectors.filter((s) => s.rank === 'strong').slice(0, 5)
  const weak = rotation.sectors.filter((s) => s.rank === 'weak').slice(0, 5).reverse()

  return (
    <Card padding="md" className="mb-6">
      <h3 className="font-bold mb-3">{strings.macro.rotationTitle}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="text-sm font-bold mb-2">{strings.macro.rotationStrong}</div>
          <ul className="space-y-1 text-sm">
            {strong.map((s) => (
              <li key={s.theme} className="flex justify-between">
                <span>{s.theme}</span>
                <span className="text-emerald-600">{strings.macro.rotationRowPct(s.avg_return_pct)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-sm font-bold mb-2">{strings.macro.rotationWeak}</div>
          <ul className="space-y-1 text-sm">
            {weak.map((s) => (
              <li key={s.theme} className="flex justify-between">
                <span>{s.theme}</span>
                <span className="text-red-600">{strings.macro.rotationRowPct(s.avg_return_pct)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  )
}
```

---

### Task 6: `EnvironmentView`에 SectorRotationCard 통합

**Files:** Modify `src/app/[basePath]/environment/EnvironmentView.tsx`

- [ ] **Step 1: 로드 + 렌더 추가**

imports에 추가:
```typescript
import SectorRotationCard from '@/components/macro/SectorRotationCard'
import { loadSectorRotation } from '@/lib/dataLoader'
import type { SectorRotationJson } from '@/lib/types/indicators'
```

state:
```typescript
const [rotation, setRotation] = useState<SectorRotationJson | null>(null)
```

기존 `loadUpdatedAt().then(...)` 안의 Promise.all에 `loadSectorRotation(u.trade_date)` 추가. 결과 setRotation.

JSX: 기존 `AutoDetectCard` 바로 아래에:
```tsx
<SectorRotationCard rotation={rotation} />
```

- [ ] **Step 2: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`

---

### Task 7: `MacroDetailPanel` 섹터 로테이션 라인 추가

**Files:** Modify `src/components/macro/MacroDetailPanel.tsx`

- [ ] **Step 1: Props 확장 + 렌더**

Read the current file first.

Props에 추가:
```typescript
sectorRotation?: import('@/lib/macro/sectorRotation').SectorRotationBonus
```

JSX — `bonus.detail` 렌더 직후(총합 라인 직전)에 섹터 로테이션 라인 삽입:
```tsx
{sectorRotation && sectorRotation.sectorRotationDelta !== 0 && (
  <div className="flex items-center justify-between p-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark">
    <span className="text-sm">
      ⚡ 섹터 로테이션 {sectorRotation.rank === 'strong' ? '🔥' : '❄️'} ({sectorRotation.activeSector})
    </span>
    <span className={`font-bold ${sectorRotation.sectorRotationDelta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
      {sectorRotation.sectorRotationDelta > 0 ? '+' : ''}{sectorRotation.sectorRotationDelta}
    </span>
  </div>
)}
```

총합 계산 시 sectorRotation.sectorRotationDelta 포함:
```typescript
const total = bonus.total + (sectorRotation?.sectorRotationDelta ?? 0)
```

기존 total 라인은 `{total}` 사용.

- [ ] **Step 2: 패널 내부에서 sectorRotation 계산**

현재 패널은 stockName/themes로 자체 계산. 섹터 로테이션도 여기서 계산:

imports:
```typescript
import { computeSectorRotationBonus } from '@/lib/macro/sectorRotation'
import { loadSectorRotation, loadStockMacroResponse, loadUpdatedAt } from '@/lib/dataLoader'
import type { SectorRotationJson, StockMacroResponseJson } from '@/lib/types/indicators'
```

state 추가:
```typescript
const [rotation, setRotation] = useState<SectorRotationJson | null>(null)
```

기존 useEffect(Promise.all에 `loadSectorRotation` 추가):
```typescript
const [r, rot] = await Promise.all([
  loadStockMacroResponse(u.trade_date),
  loadSectorRotation(u.trade_date)
])
setResponseDb(r)
setRotation(rot)
```

스코어 계산 시:
```typescript
const bonus = computeMacroBonus(stockName, themes, activeFactors)
const sectorRotation = computeSectorRotationBonus(themes, rotation)
const total = bonus.total + sectorRotation.sectorRotationDelta
```

렌더에서 `bonus.total` 대신 `total` 사용.

- [ ] **Step 3: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`

---

### Task 8: Recommendations / Screener에 sectorRotation 전달 + MacroBadge 숫자 반영

**Files:**
- Modify: `src/app/[basePath]/recommendations/RecommendationsList.tsx`
- Modify: `src/app/[basePath]/screener/ExpertScreener.tsx`

- [ ] **Step 1: RecommendationsList에 rotation 로드 + enrichWithMacro 인자 추가**

imports에 `loadSectorRotation`, `SectorRotationJson` 추가.

state: `const [rotation, setRotation] = useState<SectorRotationJson | null>(null)`

기존 data load Promise.all에 `loadSectorRotation(u.trade_date)` 추가, setRotation.

`enrichWithMacro(results, sectors, activeFactors)` → `enrichWithMacro(results, sectors, activeFactors, rotation)` 로 변경.

- [ ] **Step 2: ExpertScreener도 동일 적용**

- [ ] **Step 3: MacroBadge 합계 업데이트** — 현재 `bonus.total`만 표시. sectorRotation도 합친 총합을 표시하도록 조정 필요한지 판단:
  - `FilterResult.finalScore`가 이미 macro + rotation 합계 반영됨. 뱃지는 macroBonus.total만 표시하므로 sectorRotationBonus 별도 뱃지 사용이 낫다.
  - 또는 MacroBadge에 합산 prop 추가.

  단순하게: `RecommendationsList` / `ResultTable` 행에서 rotation delta를 별도 문구로:
  ```tsx
  {r.sectorRotationBonus && r.sectorRotationBonus.sectorRotationDelta !== 0 && (
    <span className="text-xs ml-2">
      {strings.macro.rotationBadge(r.sectorRotationBonus.sectorRotationDelta)}
    </span>
  )}
  ```

  구체적 적용 위치는 기존 MacroBadge 옆.

- [ ] **Step 4: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`

---

## Phase 16b — 시간 감쇠 (Tasks 9-12)

### Task 9: `decay.ts` 함수 + 테스트

**Files:**
- Create: `src/lib/macro/decay.ts`
- Create: `src/lib/macro/__tests__/decay.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
import { describe, it, expect } from 'vitest'
import { computeDecayFactor } from '../decay'

const DAY_MS = 24 * 60 * 60 * 1000

describe('computeDecayFactor', () => {
  const now = new Date('2026-04-17T00:00:00Z').getTime()

  it('returns 1.0 when activatedAt is undefined', () => {
    expect(computeDecayFactor(undefined, now)).toBe(1)
  })

  it('returns 1.0 within 14 days', () => {
    expect(computeDecayFactor(now - 10 * DAY_MS, now)).toBe(1.0)
  })

  it('returns 0.85 at 20 days', () => {
    expect(computeDecayFactor(now - 20 * DAY_MS, now)).toBe(0.85)
  })

  it('returns 0.70 at 40 days', () => {
    expect(computeDecayFactor(now - 40 * DAY_MS, now)).toBe(0.70)
  })

  it('returns 0.50 at 75 days', () => {
    expect(computeDecayFactor(now - 75 * DAY_MS, now)).toBe(0.50)
  })

  it('returns 0.30 at 100 days', () => {
    expect(computeDecayFactor(now - 100 * DAY_MS, now)).toBe(0.30)
  })

  it('returns 0.20 after 120 days', () => {
    expect(computeDecayFactor(now - 150 * DAY_MS, now)).toBe(0.20)
  })
})
```

- [ ] **Step 2: FAIL 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx vitest run src/lib/macro/__tests__/decay.test.ts`

- [ ] **Step 3: 구현**

```typescript
// src/lib/macro/decay.ts

const DAY_MS = 24 * 60 * 60 * 1000

export function computeDecayFactor(activatedAtMs: number | undefined, nowMs: number = Date.now()): number {
  if (activatedAtMs == null) return 1
  const ageDays = (nowMs - activatedAtMs) / DAY_MS
  if (ageDays < 14) return 1.0
  if (ageDays < 30) return 0.85
  if (ageDays < 60) return 0.70
  if (ageDays < 90) return 0.50
  if (ageDays < 120) return 0.30
  return 0.20
}
```

- [ ] **Step 4: PASS 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx vitest run src/lib/macro/__tests__/decay.test.ts`
Expected: 7 tests PASS

---

### Task 10: `useMacroFactors` v2 마이그레이션 + activatedAt 추적

**Files:** Modify `src/lib/macro/useMacroFactors.ts`

- [ ] **Step 1: Store v2로 확장**

현재 파일 읽고 전체 교체:

```typescript
'use client'
import { useCallback, useMemo } from 'react'
import { useLocalStore } from '@/lib/storage/useLocalStore'
import { macroFactors } from './factors'
import type { MacroFactor } from './types'

interface StoreV1 {
  activeIds: string[]
}
interface StoreV2 {
  version: 2
  activeIds: string[]
  activatedAt: Record<string, number>
}

type Store = StoreV1 | StoreV2

function isV2(s: Store): s is StoreV2 {
  return 'version' in s && s.version === 2
}

function toV2(s: Store): StoreV2 {
  if (isV2(s)) return s
  return { version: 2, activeIds: s.activeIds, activatedAt: {} }
}

function initialStore(): StoreV2 {
  return {
    version: 2,
    activeIds: macroFactors.filter((f) => f.defaultActive).map((f) => f.id),
    activatedAt: {}
  }
}

export function useMacroFactors(userId: string = 'anon', autoDetectedIds: string[] = []): {
  all: MacroFactor[]
  activeIds: string[]
  activeFactors: MacroFactor[]
  activatedAt: Record<string, number>
  autoDetectedIds: string[]
  toggle: (id: string) => void
  clearAll: () => void
  isActive: (id: string) => boolean
  isAutoDetected: (id: string) => boolean
  applyAllAutoDetected: () => void
} {
  const [rawStore, setRawStore] = useLocalStore<Store>(
    `ws:macroFactors:${userId}`,
    initialStore()
  )

  const store = useMemo(() => toV2(rawStore), [rawStore])

  const activeFactors = useMemo(
    () => macroFactors.filter((f) => store.activeIds.includes(f.id)),
    [store.activeIds]
  )

  const toggle = useCallback(
    (id: string) => {
      setRawStore((prev) => {
        const v2 = toV2(prev)
        const isActive = v2.activeIds.includes(id)
        if (isActive) {
          const next = v2.activeIds.filter((x) => x !== id)
          const nextAt = { ...v2.activatedAt }
          delete nextAt[id]
          return { version: 2, activeIds: next, activatedAt: nextAt }
        } else {
          // 수동 토글: activatedAt에 저장 안 함 (감쇠 없음)
          return { version: 2, activeIds: [...v2.activeIds, id], activatedAt: v2.activatedAt }
        }
      })
    },
    [setRawStore]
  )

  const clearAll = useCallback(() => {
    setRawStore({ version: 2, activeIds: [], activatedAt: {} })
  }, [setRawStore])

  const isActive = useCallback(
    (id: string) => store.activeIds.includes(id),
    [store.activeIds]
  )

  const isAutoDetected = useCallback(
    (id: string) => autoDetectedIds.includes(id),
    [autoDetectedIds]
  )

  const applyAllAutoDetected = useCallback(() => {
    const now = Date.now()
    setRawStore((prev) => {
      const v2 = toV2(prev)
      const next = [...v2.activeIds]
      const nextAt = { ...v2.activatedAt }
      for (const id of autoDetectedIds) {
        if (!next.includes(id)) {
          next.push(id)
          nextAt[id] = now
        }
      }
      return { version: 2, activeIds: next, activatedAt: nextAt }
    })
  }, [autoDetectedIds, setRawStore])

  return {
    all: macroFactors,
    activeIds: store.activeIds,
    activeFactors,
    activatedAt: store.activatedAt,
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

### Task 11: `scoring.ts` decay 반영 + 테스트 수정

**Files:**
- Modify: `src/lib/macro/scoring.ts`
- Modify: `src/lib/macro/__tests__/scoring.test.ts`

- [ ] **Step 1: `scoring.ts` 수정**

```typescript
import type { MacroFactor, MacroBonus, MacroBonusDetail } from './types'
import { matchesFactor } from './matching'
import { computeDecayFactor } from './decay'

export function computeMacroBonus(
  stockName: string,
  themes: string[] | undefined,
  activeFactors: MacroFactor[],
  activatedAt?: Record<string, number>
): MacroBonus {
  const detail: MacroBonusDetail[] = []
  for (const f of activeFactors) {
    const decay = activatedAt ? computeDecayFactor(activatedAt[f.id]) : 1
    const weight = Math.round(f.weight * decay)
    let delta = 0
    if (matchesFactor(stockName, themes, f.beneficiaries)) delta += weight
    if (matchesFactor(stockName, themes, f.losers)) delta -= weight
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

- [ ] **Step 2: 기존 테스트 — 문제없이 통과해야 함**

`computeMacroBonus` 3번째·4번째 인자가 선택적이라 기존 호출 호환. 기존 scoring.test.ts 테스트는 그대로 PASS.

신규 테스트 추가:

```typescript
it('applies decay when activatedAt is 75 days ago', () => {
  const f = mkFactor('war', ['방산'], [], 10)
  const now = Date.now()
  const DAY_MS = 86_400_000
  const activatedAt = { war: now - 75 * DAY_MS }  // 50% decay
  const result = computeMacroBonus('한화에어로스페이스', ['방산'], [f], activatedAt)
  expect(result.total).toBe(5)  // 10 * 0.5 = 5
})

it('no decay when activatedAt missing (manual toggle)', () => {
  const f = mkFactor('war', ['방산'], [], 10)
  const result = computeMacroBonus('한화에어로스페이스', ['방산'], [f], {})
  expect(result.total).toBe(10)  // full weight
})
```

- [ ] **Step 3: PASS 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx vitest run src/lib/macro`

---

### Task 12: `EnvironmentView`·`MacroDetailPanel`에서 activatedAt 전달

**Files:**
- Modify: `src/app/[basePath]/environment/EnvironmentView.tsx` (해당없음 — 표시만 할 것이면 FactorCard에)
- Modify: `src/components/macro/MacroDetailPanel.tsx`
- Modify: `src/app/[basePath]/environment/FactorCard.tsx` — "활성 N일" 표시

#### 12-A. MacroDetailPanel 스코어 계산 시 activatedAt 사용

- [ ] **Step 1**: Panel 안에서 `useMacroFactors`를 호출하는데, 그 반환값에 `activatedAt`이 있음.

현재 Panel:
```typescript
const { activeFactors } = useMacroFactors()
```

수정:
```typescript
const { activeFactors, activatedAt } = useMacroFactors()
```

computeMacroBonus 호출 시 추가:
```typescript
const bonus = computeMacroBonus(stockName, themes, activeFactors, activatedAt)
```

#### 12-B. EnvironmentView — factor cards에 activatedAt 전달

- [ ] **Step 1**: `useMacroFactors` 훅에서 `activatedAt`도 받아와 `FactorCard`에 prop으로 전달:

```tsx
<FactorCard
  key={f.id}
  factor={f}
  active={isActive(f.id)}
  autoDetected={isAutoDetected(f.id)}
  backtestResult={backtest?.factors[f.id]}
  activatedAt={activatedAt[f.id]}
  onToggle={() => toggle(f.id)}
/>
```

#### 12-C. FactorCard — "활성 N일" 표시

- [ ] **Step 1**: Props에 `activatedAt?: number` 추가

`confidenceStars` 함수 근처에 헬퍼 추가:

```typescript
function activeDays(activatedAt: number | undefined): number | null {
  if (activatedAt == null) return null
  const diff = Date.now() - activatedAt
  return Math.floor(diff / (24 * 60 * 60 * 1000))
}

function decayPct(days: number | null): number {
  if (days == null) return 100
  if (days < 14) return 100
  if (days < 30) return 85
  if (days < 60) return 70
  if (days < 90) return 50
  if (days < 120) return 30
  return 20
}
```

JSX — 강도 옆 또는 아래에 추가:

```tsx
{activeDays(activatedAt) !== null && (
  <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark ml-2">
    활성 {activeDays(activatedAt)}일 · 효과 {decayPct(activeDays(activatedAt))}%
  </span>
)}
```

- [ ] **Step 2: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`

---

## Phase 16c — 뉴스 RSS 연동 (Tasks 13-17)

### Task 13: `fetch_news_signals.py`

**Files:** Create `scripts/fetch_news_signals.py`

- [ ] **Step 1: 구현**

```python
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
```

- [ ] **Step 2: requirements에 feedparser 추가**

`scripts/requirements.txt` 읽고 `feedparser` 추가:

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && cat scripts/requirements.txt`

만약 `feedparser`가 없으면:
```
feedparser==6.0.11
```
줄 추가.

- [ ] **Step 3: 문법 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && python -c "import ast; ast.parse(open('scripts/fetch_news_signals.py', encoding='utf-8').read()); print('OK')"`

---

### Task 14: TS 타입 + 로더

**Files:**
- Modify: `src/lib/types/indicators.ts`
- Modify: `src/lib/dataLoader.ts`

- [ ] **Step 1: 타입 추가**

```typescript
export interface NewsSignal {
  count: number
  sample_titles: string[]
}

export interface NewsSignalsJson {
  updated_at: string
  period_hours: number
  total_articles: number
  signals: Record<string, NewsSignal>
}
```

- [ ] **Step 2: 로더 추가**

```typescript
const IDB_NEWS_KEY = 'news-signals-cache-v1'

export async function loadNewsSignals(tradeDate: string): Promise<NewsSignalsJson | null> {
  const cached = await getCached<NewsSignalsJson>(IDB_NEWS_KEY, tradeDate)
  if (cached) return cached
  try {
    const res = await fetch('/data/news_signals.json', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as NewsSignalsJson
    await setCached(IDB_NEWS_KEY, tradeDate, data)
    return data
  } catch {
    return null
  }
}
```

imports에 `NewsSignalsJson` 추가.

---

### Task 15: `useMacroAutoDetect` 뉴스 통합

**Files:** Modify `src/lib/macro/useMacroAutoDetect.ts`

- [ ] **Step 1: 뉴스 기반 탐지 함수 추가**

기존 코드에 추가:

```typescript
import type { MacroIndicatorsJson, FundamentalsJson, NewsSignalsJson } from '@/lib/types/indicators'
import { loadMacroIndicators, loadNewsSignals, loadUpdatedAt } from '@/lib/dataLoader'

// ... 기존 detectFromIndicators ...

export function detectFromNews(news: NewsSignalsJson | null, threshold: number = 5): string[] {
  if (!news) return []
  const detected: string[] = []
  for (const [factorId, sig] of Object.entries(news.signals)) {
    if (sig.count >= threshold) detected.push(factorId)
  }
  return detected
}

export function useMacroAutoDetect(fundamentals: FundamentalsJson | null): {
  detectedIds: string[]
  indicators: MacroIndicatorsJson | null
  news: NewsSignalsJson | null
} {
  const [detectedIds, setDetectedIds] = useState<string[]>([])
  const [indicators, setIndicators] = useState<MacroIndicatorsJson | null>(null)
  const [news, setNews] = useState<NewsSignalsJson | null>(null)

  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) return
      const [ind, n] = await Promise.all([
        loadMacroIndicators(u.trade_date),
        loadNewsSignals(u.trade_date)
      ])
      setIndicators(ind)
      setNews(n)
      const fromIndicators = detectFromIndicators(ind)
      const fromNews = detectFromNews(n)
      const trend = detectForeignTrend(fundamentals)
      const merged = new Set<string>([...fromIndicators, ...fromNews])
      if (trend === 'sell') merged.add('foreign_sell')
      else if (trend === 'buy') merged.add('foreign_buy')
      setDetectedIds([...merged])
    })
  }, [fundamentals])

  return { detectedIds, indicators, news }
}
```

**주의**: 기존 `useMacroAutoDetect`는 `string[]` 반환했는데 이제 객체 반환. 호출처 수정 필요.

- [ ] **Step 2: EnvironmentView 호출처 수정**

기존:
```typescript
const autoDetectedIds = useMacroAutoDetect(fundamentals)
```

수정:
```typescript
const { detectedIds: autoDetectedIds, news } = useMacroAutoDetect(fundamentals)
```

- [ ] **Step 3: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`

- [ ] **Step 4: autoDetect 테스트 업데이트**

기존 `autoDetect.test.ts`는 `detectFromIndicators` 단독 테스트만 함 → 그대로 유지.
뉴스 관련 테스트는 스킵 (단순 filter 로직).

---

### Task 16: 자동 감지 카드에 뉴스 근거 표시

**Files:** Modify `src/app/[basePath]/environment/AutoDetectCard.tsx`

- [ ] **Step 1: Props에 news 추가**

```typescript
import type { NewsSignalsJson } from '@/lib/types/indicators'

interface Props {
  autoDetected: MacroFactor[]
  isActive: (id: string) => boolean
  onToggle: (id: string) => void
  onApplyAll: () => void
  updatedAt: string | null
  news?: NewsSignalsJson | null
}
```

- [ ] **Step 2: 각 팩터 아래에 뉴스 근거 표시**

기존 map에서:
```tsx
{autoDetected.map((f) => {
  const active = isActive(f.id)
  const newsSignal = news?.signals[f.id]
  return (
    <div key={f.id} className="p-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark">
      <div className="flex items-center justify-between">
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
      {newsSignal && newsSignal.sample_titles.length > 0 && (
        <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
          📰 뉴스 근거: "{newsSignal.sample_titles[0]}" 외 {newsSignal.count - 1}건
        </div>
      )}
    </div>
  )
})}
```

- [ ] **Step 3: EnvironmentView에서 news prop 전달**

```tsx
<AutoDetectCard
  autoDetected={autoDetectedFactors}
  isActive={isActive}
  onToggle={toggle}
  onApplyAll={applyAllAutoDetected}
  updatedAt={indicators?.updated_at ?? null}
  news={news}
/>
```

- [ ] **Step 4: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`

---

### Task 17: 워크플로 + E2E 검증 + 커밋 + 푸시

**Files:** Modify `.github/workflows/daily-update.yml`

- [ ] **Step 1: 워크플로 단계 추가**

`Run factor backtest` 아래에:

```yaml
      - name: Calculate sector rotation
        run: |
          cd scripts
          python calculate_sector_rotation.py
        continue-on-error: true

      - name: Fetch news signals
        run: |
          cd scripts
          python fetch_news_signals.py
        continue-on-error: true
```

- [ ] **Step 2: 전체 테스트**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx vitest run`
Expected: 161 + 6(rotation) + 7(decay) + 2(scoring decay) = **176 tests PASS**

- [ ] **Step 3: tsc + build**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit && npm run build`
Expected: 성공

- [ ] **Step 4: 일괄 커밋**

```bash
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject add scripts/calculate_sector_rotation.py scripts/fetch_news_signals.py scripts/requirements.txt .github/workflows/daily-update.yml src/lib/types/indicators.ts src/lib/dataLoader.ts src/lib/macro/ src/lib/filter.ts src/lib/strings/ko.ts src/components/macro/ src/app/\[basePath\]/environment/ src/app/\[basePath\]/recommendations/RecommendationsList.tsx src/app/\[basePath\]/screener/ExpertScreener.tsx
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject commit -m "feat(phase-16): 섹터 로테이션 + 시간 감쇠 + 뉴스 RSS 연동"
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject push
```

---

## Self-Review

**Spec coverage**:
- ✅ 섹터 로테이션 → Tasks 1-8
- ✅ 시간 감쇠 → Tasks 9-12
- ✅ 뉴스 RSS → Tasks 13-16
- ✅ 워크플로 통합 → Task 17
- ❌ DART (의도적 제외 — API 키 없음)

**Type consistency**:
- `SectorRotationJson`, `NewsSignalsJson` Task 2/14에서 정의 → 후속 Task에서 동일 사용
- `useMacroAutoDetect` 반환 타입 변경(string[] → 객체) → EnvironmentView 호출처 수정 (Task 15 Step 2)
- `computeMacroBonus` 4번째 인자 activatedAt 추가 (선택적 → 기존 호출 호환)

**Placeholder scan**: 없음

**알려진 의존**:
- 실제 효과는 워크플로 수동 실행 후 발현 (sector_rotation.json, news_signals.json 생성)
- feedparser는 `scripts/requirements.txt`에 추가되어야 GitHub Actions에서 설치됨
