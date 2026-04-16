# Phase 12 — 초보자 친화 카테고리 4개 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SideNav에 ⭐지켜볼 종목 / 💼내가 산 주식 / 🗺오늘 잘 나가는 분야 / 📓내 거래 일기 4개 카테고리 + 📘용어집 + 첫 방문 가이드를 추가한다. 모든 데이터는 localStorage에 저장하며 외부 차트 라이브러리 없이 구현한다.

**Architecture:** 공용 `useLocalStore` / `useFirstVisit` 훅 위에 4개 페이지를 쌓는다. 각 페이지는 `src/app/[basePath]/<feature>/`에 page+View 컴포넌트로 분리. 차트는 div+Tailwind 비율로 직접 그린다. 모든 문자열은 `lib/strings/ko.ts`에 둔다.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Vitest + @testing-library/react, localStorage.

**Design Spec:** [`docs/superpowers/specs/2026-04-16-phase-12-trader-categories-design.md`](../specs/2026-04-16-phase-12-trader-categories-design.md)

---

## 사전 준비

- 작업 브랜치: `feature/phase-12-trader-categories`
- 기존 패턴 확인 완료:
  - 테스트: Vitest + `__tests__/` 폴더
  - import alias: `@/` = `src/`
  - 컴포넌트: function default export
  - 페이지 패턴: `app/[basePath]/<feature>/page.tsx` + `<Feature>View.tsx`
  - 문자열: `lib/strings/ko.ts`

---

## Phase A — Foundation (공용 훅 + 가이드 모달)

### Task 1: `useLocalStore` 훅

**Files:**
- Create: `MoneyProject/src/lib/storage/useLocalStore.ts`
- Test:   `MoneyProject/src/lib/storage/__tests__/useLocalStore.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// useLocalStore.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStore } from '../useLocalStore'

describe('useLocalStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns initial value when key absent', () => {
    const { result } = renderHook(() => useLocalStore('test:key', { count: 0 }))
    expect(result.current[0]).toEqual({ count: 0 })
  })

  it('persists value to localStorage', () => {
    const { result } = renderHook(() => useLocalStore('test:key', { count: 0 }))
    act(() => result.current[1]({ count: 5 }))
    expect(result.current[0]).toEqual({ count: 5 })
    const raw = localStorage.getItem('test:key')
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!)).toEqual({ version: 1, data: { count: 5 } })
  })

  it('loads existing value from localStorage', () => {
    localStorage.setItem('test:key', JSON.stringify({ version: 1, data: { count: 99 } }))
    const { result } = renderHook(() => useLocalStore('test:key', { count: 0 }))
    expect(result.current[0]).toEqual({ count: 99 })
  })

  it('uses initial value if stored data has wrong version', () => {
    localStorage.setItem('test:key', JSON.stringify({ version: 99, data: { count: 7 } }))
    const { result } = renderHook(() => useLocalStore('test:key', { count: 0 }))
    expect(result.current[0]).toEqual({ count: 0 })
  })

  it('supports updater function', () => {
    const { result } = renderHook(() => useLocalStore('test:key', { count: 0 }))
    act(() => result.current[1]((prev) => ({ count: prev.count + 1 })))
    expect(result.current[0]).toEqual({ count: 1 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd MoneyProject && npx vitest run src/lib/storage/__tests__/useLocalStore.test.tsx`
Expected: FAIL — "Cannot find module '../useLocalStore'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// useLocalStore.ts
'use client'
import { useState, useEffect, useCallback } from 'react'

const STORAGE_VERSION = 1

interface StoredEnvelope<T> {
  version: number
  data: T
}

export function useLocalStore<T>(
  key: string,
  initial: T
): [T, (v: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(initial)

  // 마운트 후 localStorage에서 로드 (SSR-safe)
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(key)
      if (!raw) return
      const parsed = JSON.parse(raw) as StoredEnvelope<T>
      if (parsed?.version === STORAGE_VERSION) {
        setState(parsed.data)
      }
    } catch {
      // corrupted data — 초기값 유지
    }
  }, [key])

  // 다른 탭 변경 감지
  useEffect(() => {
    if (typeof window === 'undefined') return
    function onStorage(e: StorageEvent) {
      if (e.key !== key || e.newValue == null) return
      try {
        const parsed = JSON.parse(e.newValue) as StoredEnvelope<T>
        if (parsed?.version === STORAGE_VERSION) {
          setState(parsed.data)
        }
      } catch { /* ignore */ }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key])

  const update = useCallback(
    (v: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v
        try {
          window.localStorage.setItem(
            key,
            JSON.stringify({ version: STORAGE_VERSION, data: next })
          )
        } catch { /* quota exceeded — 무시 */ }
        return next
      })
    },
    [key]
  )

  return [state, update]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd MoneyProject && npx vitest run src/lib/storage/__tests__/useLocalStore.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add MoneyProject/src/lib/storage/useLocalStore.ts MoneyProject/src/lib/storage/__tests__/useLocalStore.test.tsx
git commit -m "feat(storage): add useLocalStore hook with versioned envelope"
```

---

### Task 2: `useFirstVisit` 훅

**Files:**
- Create: `MoneyProject/src/lib/storage/useFirstVisit.ts`
- Test:   `MoneyProject/src/lib/storage/__tests__/useFirstVisit.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// useFirstVisit.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFirstVisit } from '../useFirstVisit'

describe('useFirstVisit', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns true on first visit', () => {
    const { result } = renderHook(() => useFirstVisit('watchlist'))
    expect(result.current[0]).toBe(true)
  })

  it('returns false after markVisited called', () => {
    const { result, rerender } = renderHook(() => useFirstVisit('watchlist'))
    act(() => result.current[1]())
    rerender()
    expect(result.current[0]).toBe(false)
  })

  it('persists across hook re-mount', () => {
    const first = renderHook(() => useFirstVisit('portfolio'))
    act(() => first.result.current[1]())
    first.unmount()
    const second = renderHook(() => useFirstVisit('portfolio'))
    expect(second.result.current[0]).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd MoneyProject && npx vitest run src/lib/storage/__tests__/useFirstVisit.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// useFirstVisit.ts
'use client'
import { useCallback } from 'react'
import { useLocalStore } from './useLocalStore'

export function useFirstVisit(pageKey: string): [boolean, () => void] {
  const [visited, setVisited] = useLocalStore<boolean>(`ws:visited:${pageKey}`, false)

  const markVisited = useCallback(() => {
    setVisited(true)
  }, [setVisited])

  return [!visited, markVisited]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd MoneyProject && npx vitest run src/lib/storage/__tests__/useFirstVisit.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add MoneyProject/src/lib/storage/useFirstVisit.ts MoneyProject/src/lib/storage/__tests__/useFirstVisit.test.tsx
git commit -m "feat(storage): add useFirstVisit hook for tutorial gating"
```

---

### Task 3: `FirstVisitGuide` 공용 모달 컴포넌트

**Files:**
- Create: `MoneyProject/src/components/common/FirstVisitGuide.tsx`
- Test:   `MoneyProject/src/components/common/__tests__/FirstVisitGuide.test.tsx`
- Modify: `MoneyProject/src/lib/strings/ko.ts` — `firstVisit` 키 추가

- [ ] **Step 1: Add strings keys**

`ko.ts` 파일 맨 끝 `}` 직전에 다음 객체 추가:

```typescript
  firstVisit: {
    skipButton: '건너뛰기',
    nextButton: '다음',
    startButton: '시작',
    dontShowAgain: '다시 보지 않기',
    closeAria: '안내 닫기'
  },
```

- [ ] **Step 2: Write the failing test**

```typescript
// FirstVisitGuide.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import FirstVisitGuide from '../FirstVisitGuide'

describe('FirstVisitGuide', () => {
  const steps = [
    { title: 'Step A', body: 'first content' },
    { title: 'Step B', body: 'second content' }
  ]

  it('renders first step initially', () => {
    render(<FirstVisitGuide steps={steps} onDismiss={() => {}} />)
    expect(screen.getByText('Step A')).toBeInTheDocument()
    expect(screen.getByText('first content')).toBeInTheDocument()
  })

  it('advances to next step on Next click', () => {
    render(<FirstVisitGuide steps={steps} onDismiss={() => {}} />)
    fireEvent.click(screen.getByText('다음'))
    expect(screen.getByText('Step B')).toBeInTheDocument()
  })

  it('shows Start button + checkbox on last step', () => {
    render(<FirstVisitGuide steps={steps} onDismiss={() => {}} />)
    fireEvent.click(screen.getByText('다음'))
    expect(screen.getByText('시작')).toBeInTheDocument()
    expect(screen.getByLabelText('다시 보지 않기')).toBeInTheDocument()
  })

  it('calls onDismiss with persist=true when checkbox checked + Start clicked', () => {
    const onDismiss = vi.fn()
    render(<FirstVisitGuide steps={steps} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByText('다음'))
    fireEvent.click(screen.getByLabelText('다시 보지 않기'))
    fireEvent.click(screen.getByText('시작'))
    expect(onDismiss).toHaveBeenCalledWith(true)
  })

  it('calls onDismiss with persist=false when Skip clicked', () => {
    const onDismiss = vi.fn()
    render(<FirstVisitGuide steps={steps} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByText('건너뛰기'))
    expect(onDismiss).toHaveBeenCalledWith(false)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd MoneyProject && npx vitest run src/components/common/__tests__/FirstVisitGuide.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 4: Implement the component**

```typescript
// FirstVisitGuide.tsx
'use client'
import { useState } from 'react'
import { strings } from '@/lib/strings/ko'

export interface GuideStep {
  title: string
  body: string
}

interface Props {
  steps: GuideStep[]
  onDismiss: (persist: boolean) => void
}

export default function FirstVisitGuide({ steps, onDismiss }: Props) {
  const [idx, setIdx] = useState(0)
  const [persist, setPersist] = useState(false)
  const isLast = idx === steps.length - 1
  const step = steps[idx]

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-bg-primary-light dark:bg-bg-primary-dark rounded-2xl shadow-soft-md p-6 max-w-sm w-full">
        <h2 className="text-lg font-bold mb-3">{step.title}</h2>
        <p className="text-sm leading-relaxed mb-5 whitespace-pre-line">{step.body}</p>

        {/* dots */}
        <div className="flex gap-1 mb-5" aria-hidden>
          {steps.map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full ${
                i === idx ? 'bg-accent-light dark:bg-accent-dark' : 'bg-bg-secondary-light dark:bg-bg-secondary-dark'
              }`}
            />
          ))}
        </div>

        {isLast && (
          <label className="flex items-center gap-2 mb-4 text-sm">
            <input
              type="checkbox"
              checked={persist}
              onChange={(e) => setPersist(e.target.checked)}
              aria-label={strings.firstVisit.dontShowAgain}
            />
            {strings.firstVisit.dontShowAgain}
          </label>
        )}

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => onDismiss(false)}
            className="px-4 py-2 text-sm text-text-secondary-light dark:text-text-secondary-dark"
          >
            {strings.firstVisit.skipButton}
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={() => onDismiss(persist)}
              className="px-4 py-2 text-sm rounded-full bg-accent-light dark:bg-accent-dark text-white"
            >
              {strings.firstVisit.startButton}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIdx((i) => Math.min(i + 1, steps.length - 1))}
              className="px-4 py-2 text-sm rounded-full bg-accent-light dark:bg-accent-dark text-white"
            >
              {strings.firstVisit.nextButton}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd MoneyProject && npx vitest run src/components/common/__tests__/FirstVisitGuide.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add MoneyProject/src/components/common/FirstVisitGuide.tsx MoneyProject/src/components/common/__tests__/FirstVisitGuide.test.tsx MoneyProject/src/lib/strings/ko.ts
git commit -m "feat(ui): add FirstVisitGuide modal component"
```

---

### Task 3.5: `dataLoader` 확장 — `loadStocks` 추가

**Files:**
- Modify: `MoneyProject/src/lib/dataLoader.ts` — `loadStocks(tradeDate)` 함수 추가

기존 `loadIndicators` / `loadFundamentals` / `loadSectors` 패턴과 동일하게 `loadStocks(tradeDate)` 헬퍼를 추가한다 (Tasks 8, 11에서 종목 검색용으로 사용).

- [ ] **Step 1: dataLoader.ts에 추가**

`MoneyProject/src/lib/dataLoader.ts` 안 `loadFundamentals` 함수 아래에 다음 추가:

```typescript
const IDB_STOCKS_KEY = 'stocks-cache-v1'

export async function loadStocks(tradeDate: string): Promise<StocksJson | null> {
  const cached = await getCached<StocksJson>(IDB_STOCKS_KEY, tradeDate)
  if (cached) return cached
  try {
    const res = await fetch('/data/stocks.json', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as StocksJson
    await setCached(IDB_STOCKS_KEY, tradeDate, data)
    return data
  } catch {
    return null
  }
}
```

import 블록 상단의 타입 import에 `StocksJson` 추가 (이미 같은 파일에서 다른 타입을 import 중이라면 같은 라인에 추가).

- [ ] **Step 2: 빌드 + Commit**

Run: `cd MoneyProject && npx tsc --noEmit`

```bash
git add MoneyProject/src/lib/dataLoader.ts
git commit -m "feat(dataLoader): add loadStocks helper for stock metadata"
```

---

## 📌 데이터 로더 사용 패턴 (Tasks 6, 9, 12, 14 참조)

`loadIndicators` / `loadFundamentals` / `loadSectors` / `loadStocks`는 **모두 `tradeDate` 인자 필수**다. 패턴:

```typescript
useEffect(() => {
  loadUpdatedAt().then(async (u) => {
    if (!u) return
    const [ind, fund, sec, stk] = await Promise.all([
      loadIndicators(u.trade_date),
      loadFundamentals(u.trade_date),
      loadSectors(u.trade_date),
      loadStocks(u.trade_date)
    ])
    setIndicators(ind)
    setFundamentals(fund)
    setSectors(sec)
    setStocks(stk)
  })
}, [])
```

각 페이지 View 컴포넌트에서 필요한 것만 호출. 단일 useEffect에서 `loadUpdatedAt → Promise.all` 패턴 사용.

---

## Phase B — ⭐ 지켜볼 종목

### Task 4: `watchlist` 저장 모듈

**Files:**
- Create: `MoneyProject/src/lib/storage/watchlist.ts`
- Test:   `MoneyProject/src/lib/storage/__tests__/watchlist.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// watchlist.test.ts
import { describe, it, expect } from 'vitest'
import {
  type WatchlistStore,
  emptyWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist
} from '../watchlist'

describe('watchlist storage', () => {
  it('emptyWatchlist returns initial state', () => {
    expect(emptyWatchlist()).toEqual({ entries: [] })
  })

  it('addToWatchlist appends entry with addedAt', () => {
    const store: WatchlistStore = { entries: [] }
    const next = addToWatchlist(store, '005930', '2026-04-16')
    expect(next.entries).toHaveLength(1)
    expect(next.entries[0]).toEqual({ code: '005930', addedAt: '2026-04-16' })
  })

  it('addToWatchlist is idempotent (same code not duplicated)', () => {
    let store: WatchlistStore = { entries: [] }
    store = addToWatchlist(store, '005930', '2026-04-16')
    store = addToWatchlist(store, '005930', '2026-04-17')
    expect(store.entries).toHaveLength(1)
    expect(store.entries[0].addedAt).toBe('2026-04-16') // 첫 추가일 유지
  })

  it('removeFromWatchlist removes by code', () => {
    let store: WatchlistStore = {
      entries: [
        { code: '005930', addedAt: '2026-04-16' },
        { code: '000660', addedAt: '2026-04-17' }
      ]
    }
    store = removeFromWatchlist(store, '005930')
    expect(store.entries).toHaveLength(1)
    expect(store.entries[0].code).toBe('000660')
  })

  it('isInWatchlist checks membership', () => {
    const store: WatchlistStore = { entries: [{ code: '005930', addedAt: '2026-04-16' }] }
    expect(isInWatchlist(store, '005930')).toBe(true)
    expect(isInWatchlist(store, '000660')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd MoneyProject && npx vitest run src/lib/storage/__tests__/watchlist.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```typescript
// watchlist.ts
export interface WatchlistEntry {
  code: string
  addedAt: string  // ISO date 'YYYY-MM-DD'
}

export interface WatchlistStore {
  entries: WatchlistEntry[]
}

export function emptyWatchlist(): WatchlistStore {
  return { entries: [] }
}

export function isInWatchlist(store: WatchlistStore, code: string): boolean {
  return store.entries.some((e) => e.code === code)
}

export function addToWatchlist(
  store: WatchlistStore,
  code: string,
  addedAt: string
): WatchlistStore {
  if (isInWatchlist(store, code)) return store
  return { entries: [...store.entries, { code, addedAt }] }
}

export function removeFromWatchlist(
  store: WatchlistStore,
  code: string
): WatchlistStore {
  return { entries: store.entries.filter((e) => e.code !== code) }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd MoneyProject && npx vitest run src/lib/storage/__tests__/watchlist.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add MoneyProject/src/lib/storage/watchlist.ts MoneyProject/src/lib/storage/__tests__/watchlist.test.ts
git commit -m "feat(storage): add watchlist CRUD helpers"
```

---

### Task 5: `WatchlistButton` 컴포넌트 (종목 상세 삽입)

**Files:**
- Create: `MoneyProject/src/components/stock/WatchlistButton.tsx`
- Test:   `MoneyProject/src/components/stock/__tests__/WatchlistButton.test.tsx`
- Modify: `MoneyProject/src/lib/strings/ko.ts` — `watchlist` 섹션 추가

- [ ] **Step 1: Add strings**

`ko.ts`에 추가:

```typescript
  watchlist: {
    pageTitle: '⭐ 지켜볼 종목',
    linkLabel: '지켜볼 종목',
    addAria: '지켜볼 종목에 추가',
    removeAria: '지켜볼 종목에서 빼기',
    added: '추가됨',
    empty: '지켜볼 종목이 없습니다. 종목 상세에서 ☆를 눌러 추가하세요.',
    sortAddedDesc: '추가순',
    sortReturnDesc: '많이 오른순',
    sortReturnAsc: '많이 내린순',
    sortName: '가나다순',
    columnPrice: '지금 가격',
    columnChange: '어제보다',
    columnAddedAt: '추가일',
    deleteConfirm: (name: string) => `${name}을(를) 지켜볼 종목에서 뺄까요?`
  },
```

- [ ] **Step 2: Write the failing test**

```typescript
// WatchlistButton.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import WatchlistButton from '../WatchlistButton'

describe('WatchlistButton', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders empty star initially', () => {
    render(<WatchlistButton code="005930" />)
    expect(screen.getByLabelText('지켜볼 종목에 추가')).toBeInTheDocument()
  })

  it('toggles to filled star after click', () => {
    render(<WatchlistButton code="005930" />)
    fireEvent.click(screen.getByLabelText('지켜볼 종목에 추가'))
    expect(screen.getByLabelText('지켜볼 종목에서 빼기')).toBeInTheDocument()
  })

  it('persists toggle to localStorage', () => {
    render(<WatchlistButton code="005930" />)
    fireEvent.click(screen.getByLabelText('지켜볼 종목에 추가'))
    const raw = localStorage.getItem('ws:watchlist:anon')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.data.entries).toHaveLength(1)
    expect(parsed.data.entries[0].code).toBe('005930')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd MoneyProject && npx vitest run src/components/stock/__tests__/WatchlistButton.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 4: Implement**

```typescript
// WatchlistButton.tsx
'use client'
import { useLocalStore } from '@/lib/storage/useLocalStore'
import {
  emptyWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist,
  type WatchlistStore
} from '@/lib/storage/watchlist'
import { strings } from '@/lib/strings/ko'

interface Props {
  code: string
  userId?: string
}

export default function WatchlistButton({ code, userId = 'anon' }: Props) {
  const [store, setStore] = useLocalStore<WatchlistStore>(
    `ws:watchlist:${userId}`,
    emptyWatchlist()
  )
  const inList = isInWatchlist(store, code)

  function toggle() {
    if (inList) {
      setStore(removeFromWatchlist(store, code))
    } else {
      const today = new Date().toISOString().slice(0, 10)
      setStore(addToWatchlist(store, code, today))
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={inList ? strings.watchlist.removeAria : strings.watchlist.addAria}
      className="text-2xl leading-none w-10 h-10 inline-flex items-center justify-center rounded-full hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark"
    >
      {inList ? '★' : '☆'}
    </button>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd MoneyProject && npx vitest run src/components/stock/__tests__/WatchlistButton.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Insert into stock detail page**

Read `MoneyProject/src/app/[basePath]/stock/[code]/StockDetail.tsx` (현재 종목 상세 컴포넌트). 종목명 옆 또는 상단 우측에 `<WatchlistButton code={code} />`를 삽입한다. 정확한 위치는 기존 헤더 영역(예: 종목명 + 가격 표시 위) 옆.

import 추가:
```typescript
import WatchlistButton from '@/components/stock/WatchlistButton'
```

JSX에 추가 (예시 — 실제 위치는 파일 구조에 맞게):
```typescript
<div className="flex items-center gap-2">
  <h1>{name}</h1>
  <WatchlistButton code={code} />
</div>
```

- [ ] **Step 7: 빌드 확인**

Run: `cd MoneyProject && npx tsc --noEmit`
Expected: 타입 에러 없음

- [ ] **Step 8: Commit**

```bash
git add MoneyProject/src/components/stock/WatchlistButton.tsx MoneyProject/src/components/stock/__tests__/WatchlistButton.test.tsx MoneyProject/src/app/[basePath]/stock/[code]/StockDetail.tsx MoneyProject/src/lib/strings/ko.ts
git commit -m "feat(watchlist): add toggle button to stock detail page"
```

---

### Task 6: `WatchlistView` 페이지

**Files:**
- Create: `MoneyProject/src/app/[basePath]/watchlist/page.tsx`
- Create: `MoneyProject/src/app/[basePath]/watchlist/WatchlistView.tsx`

- [ ] **Step 1: Create page.tsx (server component)**

```typescript
// page.tsx
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import WatchlistView from './WatchlistView'

export default function WatchlistPage({ params }: { params: { basePath: string } }) {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 min-h-[60vh]">
        <WatchlistView basePath={params.basePath} />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 2: Implement WatchlistView client component**

```typescript
// WatchlistView.tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocalStore } from '@/lib/storage/useLocalStore'
import { useFirstVisit } from '@/lib/storage/useFirstVisit'
import {
  emptyWatchlist,
  removeFromWatchlist,
  type WatchlistStore
} from '@/lib/storage/watchlist'
import { loadIndicators, loadUpdatedAt } from '@/lib/dataLoader'
import type { IndicatorsJson, StockIndicators } from '@/lib/types/indicators'
import FirstVisitGuide from '@/components/common/FirstVisitGuide'
import { strings } from '@/lib/strings/ko'

type Sort = 'addedDesc' | 'returnDesc' | 'returnAsc' | 'name'

interface Props { basePath: string }

interface Row {
  code: string
  name: string
  addedAt: string
  price: number | null
  changePct: number | null
}

function computeChange(s: StockIndicators): { price: number | null; pct: number | null } {
  const closes = s.close
  if (!closes || closes.length < 2) return { price: closes?.at(-1) ?? null, pct: null }
  const today = closes.at(-1)!
  const prev = closes.at(-2)!
  if (!prev) return { price: today, pct: null }
  return { price: today, pct: ((today - prev) / prev) * 100 }
}

export default function WatchlistView({ basePath }: Props) {
  const [store, setStore] = useLocalStore<WatchlistStore>(
    'ws:watchlist:anon',
    emptyWatchlist()
  )
  const [firstVisit, markVisited] = useFirstVisit('watchlist')
  const [showGuide, setShowGuide] = useState(false)
  const [sort, setSort] = useState<Sort>('addedDesc')
  const [indicators, setIndicators] = useState<IndicatorsJson | null>(null)

  // 첫 방문 가이드 표시
  useEffect(() => {
    if (firstVisit) setShowGuide(true)
  }, [firstVisit])

  // indicators 로드
  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) return
      const ind = await loadIndicators(u.trade_date)
      setIndicators(ind)
    })
  }, [])

  const rows: Row[] = useMemo(() => {
    if (!indicators) return store.entries.map((e) => ({
      code: e.code, name: e.code, addedAt: e.addedAt, price: null, changePct: null
    }))
    return store.entries.map((e) => {
      const s = indicators[e.code] as StockIndicators | undefined
      const { price, pct } = s ? computeChange(s) : { price: null, pct: null }
      return {
        code: e.code,
        name: s?.name ?? e.code,
        addedAt: e.addedAt,
        price,
        changePct: pct
      }
    })
  }, [store.entries, indicators])

  const sorted = useMemo(() => {
    const arr = [...rows]
    switch (sort) {
      case 'addedDesc': return arr.sort((a, b) => b.addedAt.localeCompare(a.addedAt))
      case 'returnDesc': return arr.sort((a, b) => (b.changePct ?? -Infinity) - (a.changePct ?? -Infinity))
      case 'returnAsc': return arr.sort((a, b) => (a.changePct ?? Infinity) - (b.changePct ?? Infinity))
      case 'name': return arr.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    }
  }, [rows, sort])

  function handleDelete(row: Row) {
    if (window.confirm(strings.watchlist.deleteConfirm(row.name))) {
      setStore(removeFromWatchlist(store, row.code))
    }
  }

  return (
    <>
      <h1 className="text-xl font-bold mb-4">{strings.watchlist.pageTitle}</h1>

      {store.entries.length === 0 ? (
        <p className="text-text-secondary-light dark:text-text-secondary-dark">
          {strings.watchlist.empty}
        </p>
      ) : (
        <>
          <div className="mb-3 flex gap-2 flex-wrap text-sm">
            {(['addedDesc', 'returnDesc', 'returnAsc', 'name'] as Sort[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                className={`px-3 py-1 rounded-full ${
                  sort === s
                    ? 'bg-accent-light dark:bg-accent-dark text-white'
                    : 'bg-bg-secondary-light dark:bg-bg-secondary-dark'
                }`}
              >
                {s === 'addedDesc' && strings.watchlist.sortAddedDesc}
                {s === 'returnDesc' && strings.watchlist.sortReturnDesc}
                {s === 'returnAsc' && strings.watchlist.sortReturnAsc}
                {s === 'name' && strings.watchlist.sortName}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {sorted.map((r) => {
              const positive = (r.changePct ?? 0) >= 0
              return (
                <div
                  key={r.code}
                  className="flex items-center justify-between p-3 rounded-xl bg-bg-secondary-light dark:bg-bg-secondary-dark"
                >
                  <Link
                    href={`/${basePath}/stock/${r.code}`}
                    className="font-bold hover:underline"
                  >
                    {r.name}
                  </Link>
                  <div className="flex items-center gap-4 text-sm">
                    <span>{r.price != null ? r.price.toLocaleString() + '원' : '-'}</span>
                    <span className={positive ? 'text-emerald-600' : 'text-red-600'}>
                      {r.changePct != null
                        ? `${positive ? '🟢' : '🔴'} ${positive ? '+' : ''}${r.changePct.toFixed(2)}%`
                        : '-'}
                    </span>
                    <span className="text-text-secondary-light dark:text-text-secondary-dark">
                      {r.addedAt}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(r)}
                      className="text-lg"
                      aria-label={`${r.name} 삭제`}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {showGuide && (
        <FirstVisitGuide
          steps={[
            { title: '⭐ 지켜볼 종목이란?', body: '관심있는 종목을 즐겨찾기처럼 모아두는 곳이에요.' },
            { title: '추가하는 방법', body: '종목 상세 페이지에서 ☆를 누르면 여기에 추가돼요.' },
            { title: '활용 팁', body: '매일 들어와서 종목들이 어떻게 움직이는지 확인하세요. 더 관심 없으면 🗑로 빼면 돼요.' }
          ]}
          onDismiss={(persist) => {
            setShowGuide(false)
            if (persist) markVisited()
          }}
        />
      )}
    </>
  )
}
```

- [ ] **Step 3: 빌드 확인**

Run: `cd MoneyProject && npx tsc --noEmit`
Expected: 타입 에러 없음. 만약 `loadIndicators` import path/이름이 다르면 `dataLoader.ts` 확인 후 정정.

- [ ] **Step 4: 수동 검증 (개발 서버)**

Run: `cd MoneyProject && npm run dev` (별도 터미널)
1. 종목 상세 → ☆ 클릭 → 채워진 ★ 확인
2. `/<basePath>/watchlist` 직접 접속 → 추가된 종목 표시
3. 첫 방문 모달 → "다시 보지 않기" → 새로고침 시 모달 안 뜸
4. 정렬 토글 4개 동작
5. 🗑 → confirm → 행 사라짐

- [ ] **Step 5: Commit**

```bash
git add MoneyProject/src/app/[basePath]/watchlist/
git commit -m "feat(watchlist): add /watchlist page with sort, delete, first-visit guide"
```

---

## Phase C — 💼 내가 산 주식

### Task 7: `portfolio` 저장 모듈

**Files:**
- Create: `MoneyProject/src/lib/storage/portfolio.ts`
- Test:   `MoneyProject/src/lib/storage/__tests__/portfolio.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// portfolio.test.ts
import { describe, it, expect } from 'vitest'
import {
  type PortfolioStore,
  emptyPortfolio,
  addPortfolioEntry,
  updatePortfolioEntry,
  removePortfolioEntry,
  computeTotals
} from '../portfolio'

describe('portfolio storage', () => {
  it('emptyPortfolio returns empty', () => {
    expect(emptyPortfolio()).toEqual({ entries: [] })
  })

  it('addPortfolioEntry creates entry with id', () => {
    const store: PortfolioStore = { entries: [] }
    const next = addPortfolioEntry(store, {
      code: '005930', buyPrice: 70000, quantity: 10, boughtAt: '2026-04-01'
    })
    expect(next.entries).toHaveLength(1)
    expect(next.entries[0].id).toBeTruthy()
    expect(next.entries[0].code).toBe('005930')
  })

  it('updatePortfolioEntry replaces by id', () => {
    let store: PortfolioStore = { entries: [] }
    store = addPortfolioEntry(store, { code: '005930', buyPrice: 70000, quantity: 10, boughtAt: '2026-04-01' })
    const id = store.entries[0].id
    store = updatePortfolioEntry(store, id, { buyPrice: 71000 })
    expect(store.entries[0].buyPrice).toBe(71000)
    expect(store.entries[0].quantity).toBe(10)  // 변경되지 않은 필드 유지
  })

  it('removePortfolioEntry removes by id', () => {
    let store: PortfolioStore = { entries: [] }
    store = addPortfolioEntry(store, { code: '005930', buyPrice: 70000, quantity: 10, boughtAt: '2026-04-01' })
    store = addPortfolioEntry(store, { code: '000660', buyPrice: 100000, quantity: 5, boughtAt: '2026-04-02' })
    const id = store.entries[0].id
    store = removePortfolioEntry(store, id)
    expect(store.entries).toHaveLength(1)
    expect(store.entries[0].code).toBe('000660')
  })

  it('computeTotals aggregates buy cost and value', () => {
    const store: PortfolioStore = {
      entries: [
        { id: 'a', code: '005930', buyPrice: 70000, quantity: 10, boughtAt: '2026-04-01' },
        { id: 'b', code: '000660', buyPrice: 100000, quantity: 5, boughtAt: '2026-04-02' }
      ]
    }
    const prices = { '005930': 73000, '000660': 105000 }
    const totals = computeTotals(store, prices)
    expect(totals.totalCost).toBe(70000 * 10 + 100000 * 5)  // 1,200,000
    expect(totals.totalValue).toBe(73000 * 10 + 105000 * 5) // 1,255,000
    expect(totals.totalProfit).toBe(55000)
    expect(totals.totalReturnPct).toBeCloseTo(4.583, 2)
  })

  it('computeTotals handles missing prices gracefully', () => {
    const store: PortfolioStore = {
      entries: [{ id: 'a', code: '999999', buyPrice: 50000, quantity: 2, boughtAt: '2026-04-01' }]
    }
    const totals = computeTotals(store, {})
    expect(totals.totalCost).toBe(100000)
    expect(totals.totalValue).toBe(100000)  // 가격 없으면 매수가로 대체
    expect(totals.totalProfit).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd MoneyProject && npx vitest run src/lib/storage/__tests__/portfolio.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```typescript
// portfolio.ts
export interface PortfolioEntry {
  id: string
  code: string
  buyPrice: number
  quantity: number
  boughtAt: string  // ISO date
  memo?: string
}

export interface PortfolioStore {
  entries: PortfolioEntry[]
}

export interface PortfolioTotals {
  totalCost: number
  totalValue: number
  totalProfit: number
  totalReturnPct: number
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function emptyPortfolio(): PortfolioStore {
  return { entries: [] }
}

export function addPortfolioEntry(
  store: PortfolioStore,
  fields: Omit<PortfolioEntry, 'id'>
): PortfolioStore {
  return { entries: [...store.entries, { ...fields, id: uuid() }] }
}

export function updatePortfolioEntry(
  store: PortfolioStore,
  id: string,
  patch: Partial<Omit<PortfolioEntry, 'id'>>
): PortfolioStore {
  return {
    entries: store.entries.map((e) => (e.id === id ? { ...e, ...patch } : e))
  }
}

export function removePortfolioEntry(
  store: PortfolioStore,
  id: string
): PortfolioStore {
  return { entries: store.entries.filter((e) => e.id !== id) }
}

export function computeTotals(
  store: PortfolioStore,
  prices: Record<string, number>
): PortfolioTotals {
  let totalCost = 0
  let totalValue = 0
  for (const e of store.entries) {
    const cost = e.buyPrice * e.quantity
    const cur = prices[e.code] ?? e.buyPrice
    totalCost += cost
    totalValue += cur * e.quantity
  }
  const totalProfit = totalValue - totalCost
  const totalReturnPct = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0
  return { totalCost, totalValue, totalProfit, totalReturnPct }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd MoneyProject && npx vitest run src/lib/storage/__tests__/portfolio.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add MoneyProject/src/lib/storage/portfolio.ts MoneyProject/src/lib/storage/__tests__/portfolio.test.ts
git commit -m "feat(portfolio): add portfolio CRUD + totals computation"
```

---

### Task 8: `PortfolioEntryModal` (추가/편집 폼)

**Files:**
- Create: `MoneyProject/src/app/[basePath]/portfolio/PortfolioEntryModal.tsx`
- Modify: `MoneyProject/src/lib/strings/ko.ts` — `portfolio` 섹션 추가

- [ ] **Step 1: Add strings**

```typescript
  portfolio: {
    pageTitle: '💼 내가 산 주식',
    linkLabel: '내가 산 주식',
    addButton: '＋ 산 주식 추가',
    empty: '아직 기록한 주식이 없습니다. ＋ 버튼으로 산 주식을 기록해 보세요.',
    summaryProfit: (n: number) => `지금까지 +${n.toLocaleString()}원 벌었어요 🟢`,
    summaryLoss: (n: number) => `지금까지 ${n.toLocaleString()}원 잃었어요 🔴`,
    summaryEven: '아직 손익이 거의 없어요',
    summarySubtitle: (cost: number, value: number) =>
      `(전체 산 가격 ${cost.toLocaleString()}원 → 지금 가치 ${value.toLocaleString()}원)`,
    cardBuy: (price: number, qty: number, cost: number) =>
      `산 가격: ${price.toLocaleString()}원 × ${qty}주 = ${cost.toLocaleString()}원`,
    cardNow: (price: number, qty: number, value: number) =>
      `지금:    ${price.toLocaleString()}원 × ${qty}주 = ${value.toLocaleString()}원`,
    cardProfit: (n: number, pct: number) =>
      `👉 +${n.toLocaleString()}원 벌었어요 (${pct.toFixed(2)}% 🟢)`,
    cardLoss: (n: number, pct: number) =>
      `👉 ${n.toLocaleString()}원 잃었어요 (${pct.toFixed(2)}% 🔴)`,
    cardNoPrice: '현재 가격 정보가 없어요',
    cardFooter: '※ 수수료·세금 미반영 (참고용)',
    deleteConfirm: (name: string) => `${name} 기록을 지울까요?`,
    modal: {
      addTitle: '산 주식 추가',
      editTitle: '기록 수정',
      stockLabel: '종목',
      stockPlaceholder: '종목명·코드로 검색',
      buyPriceLabel: '산 가격 (원)',
      quantityLabel: '주식 수',
      boughtAtLabel: '매수일',
      memoLabel: '메모 (선택)',
      hint: '한 번만 매수했을 때 기준이에요. 여러 번 나눠 사셨다면 평균 가격을 입력하세요.',
      save: '저장',
      cancel: '취소'
    }
  },
```

- [ ] **Step 2: Implement modal component**

```typescript
// PortfolioEntryModal.tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import { strings } from '@/lib/strings/ko'
import type { PortfolioEntry } from '@/lib/storage/portfolio'
import type { StocksJson, StockMeta } from '@/lib/types/indicators'

interface Props {
  stocks: StocksJson | null
  initial?: PortfolioEntry
  onSave: (fields: Omit<PortfolioEntry, 'id'>) => void
  onCancel: () => void
}

export default function PortfolioEntryModal({ stocks, initial, onSave, onCancel }: Props) {
  const [code, setCode] = useState(initial?.code ?? '')
  const [buyPrice, setBuyPrice] = useState<number | ''>(initial?.buyPrice ?? '')
  const [quantity, setQuantity] = useState<number | ''>(initial?.quantity ?? '')
  const [boughtAt, setBoughtAt] = useState(initial?.boughtAt ?? new Date().toISOString().slice(0, 10))
  const [memo, setMemo] = useState(initial?.memo ?? '')
  const [search, setSearch] = useState('')

  const matches = useMemo<StockMeta[]>(() => {
    if (!stocks || !search.trim()) return []
    const q = search.toLowerCase()
    return stocks.stocks.filter((s) =>
      s.name.toLowerCase().includes(q) || s.code.includes(q)
    ).slice(0, 8)
  }, [stocks, search])

  const valid = code.length > 0 && typeof buyPrice === 'number' && buyPrice > 0 && typeof quantity === 'number' && quantity > 0

  function submit() {
    if (!valid) return
    onSave({
      code,
      buyPrice: Number(buyPrice),
      quantity: Number(quantity),
      boughtAt,
      memo: memo.trim() ? memo.trim() : undefined
    })
  }

  // ESC 닫기
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const t = strings.portfolio.modal

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
      <div className="bg-bg-primary-light dark:bg-bg-primary-dark rounded-2xl shadow-soft-md p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">{initial ? t.editTitle : t.addTitle}</h2>

        <label className="block mb-3 text-sm">
          {t.stockLabel}
          {!initial && (
            <input
              type="text"
              placeholder={t.stockPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark"
            />
          )}
          {code && <p className="mt-1 font-bold">{code} {stocks?.stocks.find((s) => s.code === code)?.name ?? ''}</p>}
          {matches.length > 0 && (
            <div className="mt-2 border border-border-light dark:border-border-dark rounded-lg max-h-40 overflow-y-auto">
              {matches.map((m) => (
                <button
                  type="button"
                  key={m.code}
                  onClick={() => { setCode(m.code); setSearch('') }}
                  className="w-full text-left px-3 py-2 hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark"
                >
                  {m.name} ({m.code})
                </button>
              ))}
            </div>
          )}
        </label>

        <label className="block mb-3 text-sm">
          {t.buyPriceLabel}
          <input
            type="number"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark"
          />
        </label>

        <label className="block mb-3 text-sm">
          {t.quantityLabel}
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark"
          />
        </label>

        <label className="block mb-3 text-sm">
          {t.boughtAtLabel}
          <input
            type="date"
            value={boughtAt}
            onChange={(e) => setBoughtAt(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark"
          />
        </label>

        <label className="block mb-3 text-sm">
          {t.memoLabel}
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={2}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark"
          />
        </label>

        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-4">{t.hint}</p>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-full text-sm">
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!valid}
            className="px-4 py-2 rounded-full text-sm bg-accent-light dark:bg-accent-dark text-white disabled:opacity-50"
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 빌드 확인**

Run: `cd MoneyProject && npx tsc --noEmit`
Expected: 타입 에러 없음

- [ ] **Step 4: Commit**

```bash
git add MoneyProject/src/app/[basePath]/portfolio/PortfolioEntryModal.tsx MoneyProject/src/lib/strings/ko.ts
git commit -m "feat(portfolio): add entry modal with stock search"
```

---

### Task 9: `PortfolioView` 페이지 + page.tsx

**Files:**
- Create: `MoneyProject/src/app/[basePath]/portfolio/page.tsx`
- Create: `MoneyProject/src/app/[basePath]/portfolio/PortfolioView.tsx`

- [ ] **Step 1: Create page.tsx**

```typescript
// page.tsx
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import PortfolioView from './PortfolioView'

export default function PortfolioPage({ params }: { params: { basePath: string } }) {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 min-h-[60vh]">
        <PortfolioView basePath={params.basePath} />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 2: Implement PortfolioView**

```typescript
// PortfolioView.tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import { useLocalStore } from '@/lib/storage/useLocalStore'
import { useFirstVisit } from '@/lib/storage/useFirstVisit'
import {
  emptyPortfolio,
  addPortfolioEntry,
  updatePortfolioEntry,
  removePortfolioEntry,
  computeTotals,
  type PortfolioStore,
  type PortfolioEntry
} from '@/lib/storage/portfolio'
import { loadIndicators, loadStocks, loadUpdatedAt } from '@/lib/dataLoader'
import type { IndicatorsJson, StocksJson, StockIndicators } from '@/lib/types/indicators'
import FirstVisitGuide from '@/components/common/FirstVisitGuide'
import PortfolioEntryModal from './PortfolioEntryModal'
import { strings } from '@/lib/strings/ko'

interface Props { basePath: string }

export default function PortfolioView({ basePath }: Props) {
  const [store, setStore] = useLocalStore<PortfolioStore>('ws:portfolio:anon', emptyPortfolio())
  const [firstVisit, markVisited] = useFirstVisit('portfolio')
  const [showGuide, setShowGuide] = useState(false)
  const [modal, setModal] = useState<{ open: boolean; editing?: PortfolioEntry }>({ open: false })
  const [indicators, setIndicators] = useState<IndicatorsJson | null>(null)
  const [stocks, setStocks] = useState<StocksJson | null>(null)

  useEffect(() => { if (firstVisit) setShowGuide(true) }, [firstVisit])
  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) return
      const [ind, stk] = await Promise.all([
        loadIndicators(u.trade_date),
        loadStocks(u.trade_date)
      ])
      setIndicators(ind)
      setStocks(stk)
    })
  }, [])

  const prices: Record<string, number> = useMemo(() => {
    if (!indicators) return {}
    const out: Record<string, number> = {}
    for (const e of store.entries) {
      const s = indicators[e.code] as StockIndicators | undefined
      const last = s?.close?.at(-1)
      if (typeof last === 'number') out[e.code] = last
    }
    return out
  }, [indicators, store.entries])

  const totals = computeTotals(store, prices)

  function summaryText(): string {
    if (Math.abs(totals.totalProfit) < 1) return strings.portfolio.summaryEven
    if (totals.totalProfit > 0) return strings.portfolio.summaryProfit(Math.round(totals.totalProfit))
    return strings.portfolio.summaryLoss(Math.round(totals.totalProfit))
  }

  function handleDelete(e: PortfolioEntry) {
    const name = (indicators?.[e.code] as StockIndicators | undefined)?.name ?? e.code
    if (window.confirm(strings.portfolio.deleteConfirm(name))) {
      setStore(removePortfolioEntry(store, e.id))
    }
  }

  return (
    <>
      <h1 className="text-xl font-bold mb-4">{strings.portfolio.pageTitle}</h1>

      {/* 요약 카드 */}
      {store.entries.length > 0 && (
        <div className="mb-6 p-5 rounded-2xl bg-bg-secondary-light dark:bg-bg-secondary-dark">
          <p className="text-lg font-bold mb-1">{summaryText()}</p>
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
            {strings.portfolio.summarySubtitle(Math.round(totals.totalCost), Math.round(totals.totalValue))}
          </p>
        </div>
      )}

      {/* 추가 버튼 */}
      <button
        type="button"
        onClick={() => setModal({ open: true })}
        className="mb-4 px-4 py-2 rounded-full bg-accent-light dark:bg-accent-dark text-white text-sm"
      >
        {strings.portfolio.addButton}
      </button>

      {store.entries.length === 0 ? (
        <p className="text-text-secondary-light dark:text-text-secondary-dark">
          {strings.portfolio.empty}
        </p>
      ) : (
        <div className="space-y-3">
          {store.entries.map((e) => {
            const s = indicators?.[e.code] as StockIndicators | undefined
            const name = s?.name ?? e.code
            const cur = prices[e.code]
            const cost = e.buyPrice * e.quantity
            const value = (cur ?? e.buyPrice) * e.quantity
            const profit = value - cost
            const pct = cost > 0 ? (profit / cost) * 100 : 0
            return (
              <div key={e.id} className="p-4 rounded-2xl bg-bg-secondary-light dark:bg-bg-secondary-dark">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold">{name}</h3>
                  <div className="flex gap-2 text-sm">
                    <button type="button" onClick={() => setModal({ open: true, editing: e })}>수정</button>
                    <button type="button" onClick={() => handleDelete(e)}>삭제</button>
                  </div>
                </div>
                <p className="text-sm font-mono">{strings.portfolio.cardBuy(e.buyPrice, e.quantity, cost)}</p>
                {cur != null ? (
                  <>
                    <p className="text-sm font-mono">{strings.portfolio.cardNow(cur, e.quantity, value)}</p>
                    <p className={`mt-2 font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {profit >= 0
                        ? strings.portfolio.cardProfit(Math.round(profit), pct)
                        : strings.portfolio.cardLoss(Math.round(profit), pct)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                    {strings.portfolio.cardNoPrice}
                  </p>
                )}
              </div>
            )
          })}
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark text-center pt-2">
            {strings.portfolio.cardFooter}
          </p>
        </div>
      )}

      {modal.open && (
        <PortfolioEntryModal
          stocks={stocks}
          initial={modal.editing}
          onSave={(fields) => {
            if (modal.editing) {
              setStore(updatePortfolioEntry(store, modal.editing.id, fields))
            } else {
              setStore(addPortfolioEntry(store, fields))
            }
            setModal({ open: false })
          }}
          onCancel={() => setModal({ open: false })}
        />
      )}

      {showGuide && (
        <FirstVisitGuide
          steps={[
            { title: '💼 내가 산 주식', body: '내가 보유 중인 주식의 현재 손익을 한눈에 보여주는 곳이에요.' },
            { title: '추가하는 방법', body: '＋ 버튼으로 산 주식을 기록하세요 (산 가격, 산 주식 수).' },
            { title: '주의사항', body: '실시간 주가가 아니라 어제 종가 기준이에요.\n수수료·세금은 반영되지 않아요.' }
          ]}
          onDismiss={(persist) => {
            setShowGuide(false)
            if (persist) markVisited()
          }}
        />
      )}
    </>
  )
}
```

- [ ] **Step 3: 빌드 확인**

Run: `cd MoneyProject && npx tsc --noEmit`

- [ ] **Step 4: 수동 검증**

1. `/<basePath>/portfolio` 접속 → 첫 방문 가이드
2. ＋ 버튼 → 모달 → 종목 검색·선택 → 가격·수량·날짜 입력 → 저장
3. 카드 표시 + 요약 카드 손익 계산 검증
4. 수정 / 삭제 동작
5. 다크 모드 동작

- [ ] **Step 5: Commit**

```bash
git add MoneyProject/src/app/[basePath]/portfolio/page.tsx MoneyProject/src/app/[basePath]/portfolio/PortfolioView.tsx
git commit -m "feat(portfolio): add /portfolio page with summary, cards, modal"
```

---

## Phase D — 📓 내 거래 일기

### Task 10: `journal` 저장 모듈

**Files:**
- Create: `MoneyProject/src/lib/storage/journal.ts`
- Test:   `MoneyProject/src/lib/storage/__tests__/journal.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// journal.test.ts
import { describe, it, expect } from 'vitest'
import {
  type JournalStore,
  emptyJournal,
  addJournalEntry,
  updateJournalEntry,
  removeJournalEntry,
  computeMonthlySummary
} from '../journal'

describe('journal storage', () => {
  it('emptyJournal returns empty', () => {
    expect(emptyJournal()).toEqual({ entries: [] })
  })

  it('addJournalEntry creates entry with id', () => {
    const store: JournalStore = { entries: [] }
    const next = addJournalEntry(store, {
      date: '2026-04-15', code: '005930', type: 'buy',
      price: 70000, quantity: 10
    })
    expect(next.entries).toHaveLength(1)
    expect(next.entries[0].id).toBeTruthy()
    expect(next.entries[0].type).toBe('buy')
  })

  it('updateJournalEntry replaces by id', () => {
    let store: JournalStore = { entries: [] }
    store = addJournalEntry(store, { date: '2026-04-15', code: '005930', type: 'buy', price: 70000, quantity: 10 })
    const id = store.entries[0].id
    store = updateJournalEntry(store, id, { price: 71000 })
    expect(store.entries[0].price).toBe(71000)
  })

  it('removeJournalEntry removes by id', () => {
    let store: JournalStore = { entries: [] }
    store = addJournalEntry(store, { date: '2026-04-15', code: '005930', type: 'buy', price: 70000, quantity: 10 })
    const id = store.entries[0].id
    store = removeJournalEntry(store, id)
    expect(store.entries).toHaveLength(0)
  })

  it('computeMonthlySummary counts trades by buy/sell + win/loss', () => {
    const store: JournalStore = {
      entries: [
        { id: '1', date: '2026-04-01', code: 'A', type: 'buy', price: 100, quantity: 10 },
        { id: '2', date: '2026-04-05', code: 'A', type: 'sell', price: 110, quantity: 10, profit: 100 },
        { id: '3', date: '2026-04-10', code: 'B', type: 'buy', price: 200, quantity: 5 },
        { id: '4', date: '2026-04-15', code: 'B', type: 'sell', price: 190, quantity: 5, profit: -50 },
        { id: '5', date: '2026-03-20', code: 'C', type: 'buy', price: 50, quantity: 20 } // 다른 달
      ]
    }
    const s = computeMonthlySummary(store, '2026-04')
    expect(s.totalCount).toBe(4)
    expect(s.buyCount).toBe(2)
    expect(s.sellCount).toBe(2)
    expect(s.winCount).toBe(1)
    expect(s.lossCount).toBe(1)
  })

  it('computeMonthlySummary excludes sells without profit field', () => {
    const store: JournalStore = {
      entries: [
        { id: '1', date: '2026-04-01', code: 'A', type: 'sell', price: 110, quantity: 10 } // profit 없음
      ]
    }
    const s = computeMonthlySummary(store, '2026-04')
    expect(s.sellCount).toBe(1)
    expect(s.winCount).toBe(0)
    expect(s.lossCount).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd MoneyProject && npx vitest run src/lib/storage/__tests__/journal.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```typescript
// journal.ts
export interface JournalEntry {
  id: string
  date: string  // ISO 'YYYY-MM-DD'
  code: string
  type: 'buy' | 'sell'
  price: number
  quantity: number
  profit?: number  // 매도 시 사용자 직접 입력
  reason?: string
}

export interface JournalStore {
  entries: JournalEntry[]
}

export interface MonthlySummary {
  month: string         // 'YYYY-MM'
  totalCount: number
  buyCount: number
  sellCount: number
  winCount: number
  lossCount: number
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function emptyJournal(): JournalStore {
  return { entries: [] }
}

export function addJournalEntry(
  store: JournalStore,
  fields: Omit<JournalEntry, 'id'>
): JournalStore {
  return { entries: [...store.entries, { ...fields, id: uuid() }] }
}

export function updateJournalEntry(
  store: JournalStore,
  id: string,
  patch: Partial<Omit<JournalEntry, 'id'>>
): JournalStore {
  return {
    entries: store.entries.map((e) => (e.id === id ? { ...e, ...patch } : e))
  }
}

export function removeJournalEntry(
  store: JournalStore,
  id: string
): JournalStore {
  return { entries: store.entries.filter((e) => e.id !== id) }
}

export function computeMonthlySummary(
  store: JournalStore,
  month: string  // 'YYYY-MM'
): MonthlySummary {
  const inMonth = store.entries.filter((e) => e.date.startsWith(month))
  let buyCount = 0
  let sellCount = 0
  let winCount = 0
  let lossCount = 0
  for (const e of inMonth) {
    if (e.type === 'buy') buyCount++
    else {
      sellCount++
      if (typeof e.profit === 'number') {
        if (e.profit > 0) winCount++
        else if (e.profit < 0) lossCount++
      }
    }
  }
  return { month, totalCount: inMonth.length, buyCount, sellCount, winCount, lossCount }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd MoneyProject && npx vitest run src/lib/storage/__tests__/journal.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add MoneyProject/src/lib/storage/journal.ts MoneyProject/src/lib/storage/__tests__/journal.test.ts
git commit -m "feat(journal): add journal CRUD + monthly summary"
```

---

### Task 11: `JournalEntryModal`

**Files:**
- Create: `MoneyProject/src/app/[basePath]/journal/JournalEntryModal.tsx`
- Modify: `MoneyProject/src/lib/strings/ko.ts` — `journal` 섹션 추가

- [ ] **Step 1: Add strings**

```typescript
  journal: {
    pageTitle: '📓 내 거래 일기',
    linkLabel: '내 거래 일기',
    addButton: '＋ 기록 추가',
    empty: '아직 거래 기록이 없습니다. ＋ 버튼으로 매수·매도를 기록하세요.',
    monthlyTitle: (m: string) => `📅 이번 달 (${m}) 요약`,
    monthlyTotal: (n: number) => `총 거래: ${n}번`,
    monthlyBuySell: (b: number, s: number) => `매수: ${b}번 / 매도: ${s}번`,
    monthlyWinLoss: (w: number, l: number) => `수익 거래: ${w}번 🟢 / 손실 거래: ${l}번 🔴`,
    monthlyHint: '(수익/손실은 본인이 입력한 금액 기준)',
    cardBuy: (price: number, qty: number) => `매수 ${price.toLocaleString()}원 × ${qty}주 = ${(price * qty).toLocaleString()}원`,
    cardSell: (price: number, qty: number) => `매도 ${price.toLocaleString()}원 × ${qty}주 = ${(price * qty).toLocaleString()}원`,
    cardProfit: (n: number) => `👉 +${n.toLocaleString()}원 벌었어요 🟢`,
    cardLoss: (n: number) => `👉 ${n.toLocaleString()}원 잃었어요 🔴`,
    cardMemo: (m: string) => `메모: "${m}"`,
    deleteConfirm: '이 기록을 지울까요?',
    filterAll: '전체',
    filterBuy: '매수만',
    filterSell: '매도만',
    modal: {
      addTitle: '거래 기록 추가',
      editTitle: '거래 기록 수정',
      dateLabel: '날짜',
      stockLabel: '종목',
      stockPlaceholder: '종목명·코드로 검색',
      typeLabel: '거래 종류',
      typeBuy: '매수',
      typeSell: '매도',
      priceLabel: '가격 (원)',
      quantityLabel: '주식 수',
      profitLabel: '이번 거래로 얼마 벌었어요? (잃었으면 - 표시)',
      profitHint: '선택 입력 — 통계에 반영돼요',
      reasonLabel: '메모 (선택)',
      save: '저장',
      cancel: '취소'
    }
  },
```

- [ ] **Step 2: Implement modal**

```typescript
// JournalEntryModal.tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import { strings } from '@/lib/strings/ko'
import type { JournalEntry } from '@/lib/storage/journal'
import type { StocksJson, StockMeta } from '@/lib/types/indicators'

interface Props {
  stocks: StocksJson | null
  initial?: JournalEntry
  onSave: (fields: Omit<JournalEntry, 'id'>) => void
  onCancel: () => void
}

export default function JournalEntryModal({ stocks, initial, onSave, onCancel }: Props) {
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10))
  const [code, setCode] = useState(initial?.code ?? '')
  const [type, setType] = useState<'buy' | 'sell'>(initial?.type ?? 'buy')
  const [price, setPrice] = useState<number | ''>(initial?.price ?? '')
  const [quantity, setQuantity] = useState<number | ''>(initial?.quantity ?? '')
  const [profit, setProfit] = useState<number | ''>(initial?.profit ?? '')
  const [reason, setReason] = useState(initial?.reason ?? '')
  const [search, setSearch] = useState('')

  const matches = useMemo<StockMeta[]>(() => {
    if (!stocks || !search.trim()) return []
    const q = search.toLowerCase()
    return stocks.stocks.filter((s) =>
      s.name.toLowerCase().includes(q) || s.code.includes(q)
    ).slice(0, 8)
  }, [stocks, search])

  const valid = code.length > 0 && typeof price === 'number' && price > 0 && typeof quantity === 'number' && quantity > 0

  function submit() {
    if (!valid) return
    onSave({
      date, code, type,
      price: Number(price),
      quantity: Number(quantity),
      profit: type === 'sell' && profit !== '' ? Number(profit) : undefined,
      reason: reason.trim() ? reason.trim() : undefined
    })
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const t = strings.journal.modal

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
      <div className="bg-bg-primary-light dark:bg-bg-primary-dark rounded-2xl shadow-soft-md p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">{initial ? t.editTitle : t.addTitle}</h2>

        <label className="block mb-3 text-sm">
          {t.dateLabel}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark" />
        </label>

        <label className="block mb-3 text-sm">
          {t.stockLabel}
          {!initial && (
            <input type="text" placeholder={t.stockPlaceholder} value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark" />
          )}
          {code && <p className="mt-1 font-bold">{code} {stocks?.stocks.find((s) => s.code === code)?.name ?? ''}</p>}
          {matches.length > 0 && (
            <div className="mt-2 border border-border-light dark:border-border-dark rounded-lg max-h-40 overflow-y-auto">
              {matches.map((m) => (
                <button type="button" key={m.code} onClick={() => { setCode(m.code); setSearch('') }}
                  className="w-full text-left px-3 py-2 hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark">
                  {m.name} ({m.code})
                </button>
              ))}
            </div>
          )}
        </label>

        <fieldset className="mb-3 text-sm">
          <legend>{t.typeLabel}</legend>
          <label className="mr-4">
            <input type="radio" checked={type === 'buy'} onChange={() => setType('buy')} /> {t.typeBuy}
          </label>
          <label>
            <input type="radio" checked={type === 'sell'} onChange={() => setType('sell')} /> {t.typeSell}
          </label>
        </fieldset>

        <label className="block mb-3 text-sm">
          {t.priceLabel}
          <input type="number" value={price}
            onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark" />
        </label>

        <label className="block mb-3 text-sm">
          {t.quantityLabel}
          <input type="number" value={quantity}
            onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark" />
        </label>

        {type === 'sell' && (
          <label className="block mb-3 text-sm">
            {t.profitLabel}
            <input type="number" value={profit}
              onChange={(e) => setProfit(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark" />
            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">{t.profitHint}</p>
          </label>
        )}

        <label className="block mb-4 text-sm">
          {t.reasonLabel}
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark" />
        </label>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-full text-sm">{t.cancel}</button>
          <button type="button" onClick={submit} disabled={!valid}
            className="px-4 py-2 rounded-full text-sm bg-accent-light dark:bg-accent-dark text-white disabled:opacity-50">
            {t.save}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 빌드 확인 + Commit**

Run: `cd MoneyProject && npx tsc --noEmit`

```bash
git add MoneyProject/src/app/[basePath]/journal/JournalEntryModal.tsx MoneyProject/src/lib/strings/ko.ts
git commit -m "feat(journal): add entry modal with optional profit field"
```

---

### Task 12: `JournalView` 페이지

**Files:**
- Create: `MoneyProject/src/app/[basePath]/journal/page.tsx`
- Create: `MoneyProject/src/app/[basePath]/journal/JournalView.tsx`

- [ ] **Step 1: page.tsx**

```typescript
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import JournalView from './JournalView'

export default function JournalPage({ params }: { params: { basePath: string } }) {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 min-h-[60vh]">
        <JournalView basePath={params.basePath} />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 2: JournalView**

```typescript
// JournalView.tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import { useLocalStore } from '@/lib/storage/useLocalStore'
import { useFirstVisit } from '@/lib/storage/useFirstVisit'
import {
  emptyJournal,
  addJournalEntry,
  updateJournalEntry,
  removeJournalEntry,
  computeMonthlySummary,
  type JournalStore,
  type JournalEntry
} from '@/lib/storage/journal'
import { loadIndicators, loadStocks, loadUpdatedAt } from '@/lib/dataLoader'
import type { IndicatorsJson, StocksJson, StockIndicators } from '@/lib/types/indicators'
import FirstVisitGuide from '@/components/common/FirstVisitGuide'
import JournalEntryModal from './JournalEntryModal'
import { strings } from '@/lib/strings/ko'

interface Props { basePath: string }

type Filter = 'all' | 'buy' | 'sell'

export default function JournalView({ basePath: _basePath }: Props) {
  const [store, setStore] = useLocalStore<JournalStore>('ws:journal:anon', emptyJournal())
  const [firstVisit, markVisited] = useFirstVisit('journal')
  const [showGuide, setShowGuide] = useState(false)
  const [modal, setModal] = useState<{ open: boolean; editing?: JournalEntry }>({ open: false })
  const [indicators, setIndicators] = useState<IndicatorsJson | null>(null)
  const [stocks, setStocks] = useState<StocksJson | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => { if (firstVisit) setShowGuide(true) }, [firstVisit])
  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) return
      const [ind, stk] = await Promise.all([
        loadIndicators(u.trade_date),
        loadStocks(u.trade_date)
      ])
      setIndicators(ind)
      setStocks(stk)
    })
  }, [])

  const currentMonth = new Date().toISOString().slice(0, 7) // 'YYYY-MM'
  const summary = computeMonthlySummary(store, currentMonth)

  const filtered = useMemo(() => {
    const list = filter === 'all' ? store.entries : store.entries.filter((e) => e.type === filter)
    return [...list].sort((a, b) => b.date.localeCompare(a.date))
  }, [store.entries, filter])

  function nameOf(code: string): string {
    return (indicators?.[code] as StockIndicators | undefined)?.name ?? code
  }

  function handleDelete(e: JournalEntry) {
    if (window.confirm(strings.journal.deleteConfirm)) {
      setStore(removeJournalEntry(store, e.id))
    }
  }

  return (
    <>
      <h1 className="text-xl font-bold mb-4">{strings.journal.pageTitle}</h1>

      {/* 월별 요약 */}
      <div className="mb-6 p-5 rounded-2xl bg-bg-secondary-light dark:bg-bg-secondary-dark">
        <h2 className="font-bold mb-2">{strings.journal.monthlyTitle(currentMonth)}</h2>
        <p className="text-sm">{strings.journal.monthlyTotal(summary.totalCount)}</p>
        <p className="text-sm">{strings.journal.monthlyBuySell(summary.buyCount, summary.sellCount)}</p>
        <p className="text-sm">{strings.journal.monthlyWinLoss(summary.winCount, summary.lossCount)}</p>
        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-2">{strings.journal.monthlyHint}</p>
      </div>

      <div className="mb-4 flex gap-2 items-center justify-between flex-wrap">
        <div className="flex gap-2 text-sm">
          {(['all', 'buy', 'sell'] as Filter[]).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full ${
                filter === f
                  ? 'bg-accent-light dark:bg-accent-dark text-white'
                  : 'bg-bg-secondary-light dark:bg-bg-secondary-dark'
              }`}>
              {f === 'all' && strings.journal.filterAll}
              {f === 'buy' && strings.journal.filterBuy}
              {f === 'sell' && strings.journal.filterSell}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setModal({ open: true })}
          className="px-4 py-2 rounded-full bg-accent-light dark:bg-accent-dark text-white text-sm">
          {strings.journal.addButton}
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-text-secondary-light dark:text-text-secondary-dark">{strings.journal.empty}</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <div key={e.id} className="p-4 rounded-2xl bg-bg-secondary-light dark:bg-bg-secondary-dark">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{e.date}</p>
                  <h3 className="font-bold">{nameOf(e.code)}</h3>
                </div>
                <div className="flex gap-2 text-sm">
                  <button type="button" onClick={() => setModal({ open: true, editing: e })}>수정</button>
                  <button type="button" onClick={() => handleDelete(e)}>삭제</button>
                </div>
              </div>
              <p className="text-sm font-mono">
                {e.type === 'buy'
                  ? strings.journal.cardBuy(e.price, e.quantity)
                  : strings.journal.cardSell(e.price, e.quantity)}
              </p>
              {e.type === 'sell' && typeof e.profit === 'number' && (
                <p className={`mt-1 font-bold ${e.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {e.profit >= 0
                    ? strings.journal.cardProfit(e.profit)
                    : strings.journal.cardLoss(e.profit)}
                </p>
              )}
              {e.reason && (
                <p className="mt-1 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                  {strings.journal.cardMemo(e.reason)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <JournalEntryModal
          stocks={stocks}
          initial={modal.editing}
          onSave={(fields) => {
            if (modal.editing) {
              setStore(updateJournalEntry(store, modal.editing.id, fields))
            } else {
              setStore(addJournalEntry(store, fields))
            }
            setModal({ open: false })
          }}
          onCancel={() => setModal({ open: false })}
        />
      )}

      {showGuide && (
        <FirstVisitGuide
          steps={[
            { title: '📓 내 거래 일기', body: '매수·매도 기록을 남기는 곳이에요.' },
            { title: '기록 방법', body: '＋ 버튼으로 거래를 기록하세요. 매도할 때 "얼마 벌었는지"를 입력하면 통계에 반영돼요.' },
            { title: '활용 팁', body: '메모에 "왜 샀는지" 적어두면 나중에 복기할 때 도움돼요.' }
          ]}
          onDismiss={(persist) => {
            setShowGuide(false)
            if (persist) markVisited()
          }}
        />
      )}
    </>
  )
}
```

- [ ] **Step 3: 빌드 + 수동 검증**

Run: `cd MoneyProject && npx tsc --noEmit`

수동: 매수 기록 추가 → 매도 기록 추가 (profit 입력) → 월별 요약 카운트 확인

- [ ] **Step 4: Commit**

```bash
git add MoneyProject/src/app/[basePath]/journal/page.tsx MoneyProject/src/app/[basePath]/journal/JournalView.tsx
git commit -m "feat(journal): add /journal page with monthly summary, filter, modal"
```

---

## Phase E — 🗺 오늘 잘 나가는 분야

### Task 13: `sectorAggregation` 유틸리티

**Files:**
- Create: `MoneyProject/src/lib/sectorAggregation.ts`
- Test:   `MoneyProject/src/lib/__tests__/sectorAggregation.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// sectorAggregation.test.ts
import { describe, it, expect } from 'vitest'
import { aggregateSectors, type SectorAggregate } from '../sectorAggregation'
import type { IndicatorsJson, FundamentalsJson, SectorsJson, StockIndicators } from '@/lib/types/indicators'

function mkStock(close: number[]): StockIndicators {
  return {
    name: 'X', market: 'KOSPI',
    dates: close.map((_, i) => `2026-04-${String(i + 1).padStart(2, '0')}`),
    close, volume: close.map(() => 100),
    ma5: [], ma20: [], ma60: [], ma120: [],
    rsi14: [], macd_line: [], macd_signal: [], macd_hist: [],
    bb_upper: [], bb_middle: [], bb_lower: [],
    high52w: null, has_52w: false, vol_avg20: null
  }
}

describe('aggregateSectors', () => {
  it('groups stocks by sector and computes weighted average return', () => {
    const indicators: IndicatorsJson = {
      meta: { updated_at: '', trade_date: '', stock_count: 0, days: 30 },
      A: { ...mkStock([100, 110]), name: 'A' },  // +10%
      B: { ...mkStock([100, 105]), name: 'B' },  //  +5%
      C: { ...mkStock([100, 95]), name: 'C' }    //  -5%
    } as IndicatorsJson
    const fundamentals: FundamentalsJson = {
      A: { pbr: null, per: null, market_cap: 1000, foreign_net: [], institution_net: [] },
      B: { pbr: null, per: null, market_cap: 1000, foreign_net: [], institution_net: [] },
      C: { pbr: null, per: null, market_cap: 2000, foreign_net: [], institution_net: [] }
    }
    const sectors: SectorsJson = {
      A: { sector: '반도체', industry: '', themes: [] },
      B: { sector: '반도체', industry: '', themes: [] },
      C: { sector: '바이오', industry: '', themes: [] }
    }

    const result = aggregateSectors(indicators, fundamentals, sectors)

    const semi = result.find((r) => r.sector === '반도체')!
    expect(semi.totalMarketCap).toBe(2000)
    expect(semi.weightedReturnPct).toBeCloseTo(7.5, 2)  // (10*1000 + 5*1000) / 2000

    const bio = result.find((r) => r.sector === '바이오')!
    expect(bio.weightedReturnPct).toBeCloseTo(-5, 2)
  })

  it('puts stocks without sector under "미분류"', () => {
    const indicators: IndicatorsJson = {
      meta: { updated_at: '', trade_date: '', stock_count: 0, days: 30 },
      X: { ...mkStock([100, 102]), name: 'X' }
    } as IndicatorsJson
    const fundamentals: FundamentalsJson = {
      X: { pbr: null, per: null, market_cap: 500, foreign_net: [], institution_net: [] }
    }
    const sectors: SectorsJson = {}

    const result = aggregateSectors(indicators, fundamentals, sectors)
    expect(result.find((r) => r.sector === '미분류')).toBeDefined()
  })

  it('skips stocks with fewer than 2 close points', () => {
    const indicators: IndicatorsJson = {
      meta: { updated_at: '', trade_date: '', stock_count: 0, days: 30 },
      Y: { ...mkStock([100]), name: 'Y' }
    } as IndicatorsJson
    const fundamentals: FundamentalsJson = {
      Y: { pbr: null, per: null, market_cap: 500, foreign_net: [], institution_net: [] }
    }
    const sectors: SectorsJson = { Y: { sector: '반도체', industry: '', themes: [] } }

    const result = aggregateSectors(indicators, fundamentals, sectors)
    expect(result).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd MoneyProject && npx vitest run src/lib/__tests__/sectorAggregation.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```typescript
// sectorAggregation.ts
import type {
  IndicatorsJson,
  FundamentalsJson,
  SectorsJson,
  StockIndicators
} from '@/lib/types/indicators'

export interface SectorAggregate {
  sector: string
  totalMarketCap: number
  weightedReturnPct: number
  stockCodes: string[]
}

export function aggregateSectors(
  indicators: IndicatorsJson,
  fundamentals: FundamentalsJson,
  sectors: SectorsJson
): SectorAggregate[] {
  const buckets = new Map<string, { weightedSum: number; cap: number; codes: string[] }>()

  for (const [code, val] of Object.entries(indicators)) {
    if (code === 'meta') continue
    const s = val as StockIndicators
    if (!s.close || s.close.length < 2) continue
    const today = s.close.at(-1)
    const prev = s.close.at(-2)
    if (typeof today !== 'number' || typeof prev !== 'number' || prev <= 0) continue
    const ret = ((today - prev) / prev) * 100
    const cap = fundamentals[code]?.market_cap ?? 0
    if (cap <= 0) continue
    const sectorName = sectors[code]?.sector?.trim() || '미분류'
    const cur = buckets.get(sectorName) ?? { weightedSum: 0, cap: 0, codes: [] }
    cur.weightedSum += ret * cap
    cur.cap += cap
    cur.codes.push(code)
    buckets.set(sectorName, cur)
  }

  const out: SectorAggregate[] = []
  for (const [sector, b] of buckets) {
    out.push({
      sector,
      totalMarketCap: b.cap,
      weightedReturnPct: b.cap > 0 ? b.weightedSum / b.cap : 0,
      stockCodes: b.codes
    })
  }
  return out
}
```

- [ ] **Step 4: Run test + Commit**

Run: `cd MoneyProject && npx vitest run src/lib/__tests__/sectorAggregation.test.ts`
Expected: PASS (3 tests)

```bash
git add MoneyProject/src/lib/sectorAggregation.ts MoneyProject/src/lib/__tests__/sectorAggregation.test.ts
git commit -m "feat(heatmap): add sectorAggregation utility"
```

---

### Task 14: `HeatmapView` 페이지 + 막대 컴포넌트

**Files:**
- Create: `MoneyProject/src/app/[basePath]/heatmap/page.tsx`
- Create: `MoneyProject/src/app/[basePath]/heatmap/HeatmapView.tsx`
- Create: `MoneyProject/src/app/[basePath]/heatmap/SectorBar.tsx`
- Modify: `MoneyProject/src/lib/strings/ko.ts` — `heatmap` 섹션 추가

- [ ] **Step 1: Add strings**

```typescript
  heatmap: {
    pageTitle: '🗺 오늘 잘 나가는 분야',
    linkLabel: '오늘 잘 나가는 분야',
    topTitle: '🔥 오늘 가장 잘 나가는 5 분야',
    bottomTitle: '❄️ 오늘 힘든 5 분야',
    selectedSectorTitle: (s: string) => `📈 ${s} 종목 (등락순 Top 20)`,
    pickHint: '분야를 클릭하면 그 분야 종목들이 나와요',
    empty: '오늘은 데이터가 충분하지 않아요'
  },
```

- [ ] **Step 2: page.tsx**

```typescript
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import HeatmapView from './HeatmapView'

export default function HeatmapPage({ params }: { params: { basePath: string } }) {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 min-h-[60vh]">
        <HeatmapView basePath={params.basePath} />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 3: SectorBar 컴포넌트**

```typescript
// SectorBar.tsx
'use client'

interface Props {
  sector: string
  pct: number
  maxAbsPct: number
  positive: boolean
  onClick: () => void
  active: boolean
}

export default function SectorBar({ sector, pct, maxAbsPct, positive, onClick, active }: Props) {
  const widthPct = maxAbsPct > 0 ? Math.min(100, (Math.abs(pct) / maxAbsPct) * 100) : 0
  const colorClass = positive ? 'bg-emerald-500' : 'bg-red-500'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl ${
        active ? 'ring-2 ring-accent-light dark:ring-accent-dark' : ''
      } bg-bg-secondary-light dark:bg-bg-secondary-dark`}
    >
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="font-bold">{sector}</span>
        <span className={positive ? 'text-emerald-600' : 'text-red-600'}>
          {positive ? '🟢' : '🔴'} {positive ? '+' : ''}{pct.toFixed(2)}%
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
        <div className={`h-full ${colorClass}`} style={{ width: `${widthPct}%` }} />
      </div>
    </button>
  )
}
```

- [ ] **Step 4: HeatmapView**

```typescript
// HeatmapView.tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useFirstVisit } from '@/lib/storage/useFirstVisit'
import { aggregateSectors } from '@/lib/sectorAggregation'
import { loadIndicators, loadFundamentals, loadSectors, loadUpdatedAt } from '@/lib/dataLoader'
import type { IndicatorsJson, FundamentalsJson, SectorsJson, StockIndicators } from '@/lib/types/indicators'
import FirstVisitGuide from '@/components/common/FirstVisitGuide'
import SectorBar from './SectorBar'
import { strings } from '@/lib/strings/ko'

interface Props { basePath: string }

export default function HeatmapView({ basePath }: Props) {
  const [indicators, setIndicators] = useState<IndicatorsJson | null>(null)
  const [fundamentals, setFundamentals] = useState<FundamentalsJson | null>(null)
  const [sectors, setSectors] = useState<SectorsJson | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [firstVisit, markVisited] = useFirstVisit('heatmap')
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => { if (firstVisit) setShowGuide(true) }, [firstVisit])
  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) return
      const [ind, fund, sec] = await Promise.all([
        loadIndicators(u.trade_date),
        loadFundamentals(u.trade_date),
        loadSectors(u.trade_date)
      ])
      setIndicators(ind)
      setFundamentals(fund)
      setSectors(sec)
    })
  }, [])

  const aggregates = useMemo(() => {
    if (!indicators || !fundamentals || !sectors) return []
    return aggregateSectors(indicators, fundamentals, sectors)
      .filter((a) => a.sector !== '미분류')
  }, [indicators, fundamentals, sectors])

  const top5 = useMemo(() =>
    [...aggregates].sort((a, b) => b.weightedReturnPct - a.weightedReturnPct).slice(0, 5)
  , [aggregates])

  const bottom5 = useMemo(() =>
    [...aggregates].sort((a, b) => a.weightedReturnPct - b.weightedReturnPct).slice(0, 5)
  , [aggregates])

  const maxAbs = useMemo(() => {
    const all = [...top5, ...bottom5].map((a) => Math.abs(a.weightedReturnPct))
    return all.length > 0 ? Math.max(...all) : 1
  }, [top5, bottom5])

  const selectedStocks = useMemo(() => {
    if (!selected || !indicators) return []
    const agg = aggregates.find((a) => a.sector === selected)
    if (!agg) return []
    return agg.stockCodes
      .map((code) => {
        const s = indicators[code] as StockIndicators | undefined
        if (!s || !s.close || s.close.length < 2) return null
        const today = s.close.at(-1)!
        const prev = s.close.at(-2)!
        return { code, name: s.name, pct: ((today - prev) / prev) * 100, price: today }
      })
      .filter((x): x is { code: string; name: string; pct: number; price: number } => x !== null)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 20)
  }, [selected, aggregates, indicators])

  return (
    <>
      <h1 className="text-xl font-bold mb-2">{strings.heatmap.pageTitle}</h1>
      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">
        {strings.heatmap.pickHint}
      </p>

      {aggregates.length === 0 ? (
        <p>{strings.heatmap.empty}</p>
      ) : (
        <>
          <h2 className="font-bold mb-2">{strings.heatmap.topTitle}</h2>
          <div className="space-y-2 mb-6">
            {top5.map((a) => (
              <SectorBar
                key={a.sector}
                sector={a.sector}
                pct={a.weightedReturnPct}
                maxAbsPct={maxAbs}
                positive={a.weightedReturnPct >= 0}
                active={selected === a.sector}
                onClick={() => setSelected(a.sector === selected ? null : a.sector)}
              />
            ))}
          </div>

          <h2 className="font-bold mb-2">{strings.heatmap.bottomTitle}</h2>
          <div className="space-y-2 mb-6">
            {bottom5.map((a) => (
              <SectorBar
                key={a.sector}
                sector={a.sector}
                pct={a.weightedReturnPct}
                maxAbsPct={maxAbs}
                positive={a.weightedReturnPct >= 0}
                active={selected === a.sector}
                onClick={() => setSelected(a.sector === selected ? null : a.sector)}
              />
            ))}
          </div>

          {selected && (
            <div className="mt-4">
              <h2 className="font-bold mb-3">{strings.heatmap.selectedSectorTitle(selected)}</h2>
              <div className="space-y-1">
                {selectedStocks.map((s) => (
                  <Link
                    key={s.code}
                    href={`/${basePath}/stock/${s.code}`}
                    className="flex justify-between p-2 rounded-lg hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark"
                  >
                    <span>{s.name}</span>
                    <span className="flex gap-3 text-sm">
                      <span>{s.price.toLocaleString()}원</span>
                      <span className={s.pct >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                        {s.pct >= 0 ? '+' : ''}{s.pct.toFixed(2)}%
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showGuide && (
        <FirstVisitGuide
          steps={[
            { title: '🗺 오늘 잘 나가는 분야', body: '오늘 어떤 분야가 강한지/약한지 한눈에 보여요.' },
            { title: '사용 방법', body: '분야를 클릭하면 그 분야 종목들이 나와요.' },
            { title: '활용 팁', body: '매일 흐름이 바뀌니 자주 확인하세요. 강한 분야의 종목을 살펴보세요.' }
          ]}
          onDismiss={(persist) => {
            setShowGuide(false)
            if (persist) markVisited()
          }}
        />
      )}
    </>
  )
}
```

- [ ] **Step 5: 빌드 + 수동 검증**

Run: `cd MoneyProject && npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add MoneyProject/src/app/[basePath]/heatmap/ MoneyProject/src/lib/strings/ko.ts
git commit -m "feat(heatmap): add /heatmap page with top/bottom 5 sector bars"
```

---

## Phase F — 📘 용어집

### Task 15: 용어 데이터 + 페이지

**Files:**
- Create: `MoneyProject/src/lib/glossary/terms.ts`
- Create: `MoneyProject/src/app/[basePath]/glossary/page.tsx`
- Create: `MoneyProject/src/app/[basePath]/glossary/GlossaryView.tsx`
- Modify: `MoneyProject/src/lib/strings/ko.ts` — `glossary` 섹션

- [ ] **Step 1: terms.ts (정적 데이터)**

```typescript
// terms.ts
export type GlossaryCategory = '기본 용어' | '수익 관련' | '시장 흐름' | '기술 분석' | '투자 주체'

export interface GlossaryTerm {
  term: string
  category: GlossaryCategory
  body: string
}

export const glossaryTerms: GlossaryTerm[] = [
  // 기본 용어 (10)
  { term: '주식', category: '기본 용어', body: '회사의 소유권을 나누어놓은 증서. 주식을 사면 그 회사의 작은 주인이 됩니다.' },
  { term: '주가', category: '기본 용어', body: '주식 1주의 현재 거래 가격.' },
  { term: '시가총액', category: '기본 용어', body: '주가 × 발행주식 수. 회사 전체의 시장 가치.' },
  { term: '거래량', category: '기본 용어', body: '하루 동안 사고팔린 주식 수량. 많을수록 인기 있는 종목.' },
  { term: '종가', category: '기본 용어', body: '오늘 시장이 닫힐 때의 마지막 가격.' },
  { term: '매수', category: '기본 용어', body: '주식을 사는 것.' },
  { term: '매도', category: '기본 용어', body: '주식을 파는 것.' },
  { term: '호가', category: '기본 용어', body: '사거나 팔겠다고 부른 가격. 매수 호가와 매도 호가가 만나면 거래 성사.' },
  { term: '보합', category: '기본 용어', body: '주가가 거의 변하지 않은 상태.' },
  { term: '상한가·하한가', category: '기본 용어', body: '하루에 오를 수 있는 최대치(상한가) / 내릴 수 있는 최대치(하한가). 한국은 ±30%.' },

  // 수익 관련 (5)
  { term: '수익률', category: '수익 관련', body: '산 가격 대비 지금 얼마 이익(또는 손실)인지 % 로 표현한 것.\n예: 70,000원에 사서 73,000원이 되면 +4.3% 수익률.\n계산법: (현재가 - 산 가격) ÷ 산 가격 × 100' },
  { term: '손익', category: '수익 관련', body: '수익(이익) 또는 손실(손해)의 줄임말. "+5만원" 또는 "-3만원" 같은 금액.' },
  { term: '평단가', category: '수익 관련', body: '여러 번 나눠서 산 경우의 평균 매수 가격.' },
  { term: '손절', category: '수익 관련', body: '더 큰 손실을 막기 위해 손해를 보고 파는 것.' },
  { term: '익절', category: '수익 관련', body: '수익을 확정 짓기 위해 이익이 난 상태에서 파는 것.' },

  // 시장 흐름 (5)
  { term: '상승장 (불장)', category: '시장 흐름', body: '전반적으로 주가가 오르는 시기. 영어로 Bull market.' },
  { term: '하락장 (베어장)', category: '시장 흐름', body: '전반적으로 주가가 내리는 시기. 영어로 Bear market.' },
  { term: '횡보', category: '시장 흐름', body: '주가가 오르지도 내리지도 않고 일정 범위에서 움직이는 상태.' },
  { term: '변동성', category: '시장 흐름', body: '주가가 위아래로 얼마나 크게 움직이는지의 정도. 높으면 위험·기회 모두 큼.' },
  { term: '추세', category: '시장 흐름', body: '주가가 일정 방향(위·아래·옆)으로 움직이는 흐름.' },

  // 기술 분석 (5)
  { term: '이동평균선 (MA)', category: '기술 분석', body: '최근 N일 종가의 평균을 이은 선. MA20은 20일 평균, MA60은 60일 평균. 추세 파악에 사용.' },
  { term: '골든크로스', category: '기술 분석', body: '짧은 이동평균선이 긴 이동평균선을 아래에서 위로 뚫고 올라가는 시점. 상승 신호로 해석.' },
  { term: '데드크로스', category: '기술 분석', body: '짧은 이동평균선이 긴 이동평균선을 위에서 아래로 내려오는 시점. 하락 신호로 해석.' },
  { term: 'RSI', category: '기술 분석', body: '0~100 사이 값으로 과매수(70 이상) / 과매도(30 이하)를 판단하는 지표.' },
  { term: '볼린저밴드', category: '기술 분석', body: '주가의 표준편차로 상한·하한 밴드를 그려 가격 변동 범위를 시각화.' },

  // 투자 주체 (5)
  { term: '외국인', category: '투자 주체', body: '해외 투자자. 큰 자금으로 매매해 시장에 영향이 큼.' },
  { term: '기관', category: '투자 주체', body: '연기금·자산운용사·은행 등 큰 조직 투자자.' },
  { term: '개인', category: '투자 주체', body: '개인 투자자. 소위 개미.' },
  { term: '공매도', category: '투자 주체', body: '주식을 빌려서 먼저 팔고, 나중에 더 싸게 사서 갚아 차익을 노리는 거래. 하락 베팅.' },
  { term: '배당', category: '투자 주체', body: '회사가 이익의 일부를 주주에게 현금이나 주식으로 나눠주는 것.' }
]
```

- [ ] **Step 2: Add strings**

```typescript
  glossary: {
    pageTitle: '📘 용어집',
    linkLabel: '용어집',
    searchPlaceholder: '용어 검색',
    categoryAll: '전체',
    empty: '검색 결과가 없습니다'
  },
```

- [ ] **Step 3: page.tsx**

```typescript
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import GlossaryView from './GlossaryView'

export default function GlossaryPage() {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 min-h-[60vh]">
        <GlossaryView />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 4: GlossaryView**

```typescript
// GlossaryView.tsx
'use client'
import { useMemo, useState } from 'react'
import { glossaryTerms, type GlossaryCategory } from '@/lib/glossary/terms'
import { strings } from '@/lib/strings/ko'

const CATEGORIES: (GlossaryCategory | '전체')[] = [
  '전체', '기본 용어', '수익 관련', '시장 흐름', '기술 분석', '투자 주체'
]

export default function GlossaryView() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<GlossaryCategory | '전체'>('전체')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return glossaryTerms.filter((t) => {
      if (category !== '전체' && t.category !== category) return false
      if (q && !t.term.toLowerCase().includes(q) && !t.body.toLowerCase().includes(q)) return false
      return true
    })
  }, [search, category])

  return (
    <>
      <h1 className="text-xl font-bold mb-4">{strings.glossary.pageTitle}</h1>

      <input
        type="text"
        placeholder={strings.glossary.searchPlaceholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-3 px-3 py-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark"
      />

      <div className="flex gap-2 mb-5 flex-wrap text-sm">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`px-3 py-1 rounded-full ${
              category === c
                ? 'bg-accent-light dark:bg-accent-dark text-white'
                : 'bg-bg-secondary-light dark:bg-bg-secondary-dark'
            }`}
          >
            {c === '전체' ? strings.glossary.categoryAll : c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-text-secondary-light dark:text-text-secondary-dark">
          {strings.glossary.empty}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <div key={t.term} className="p-4 rounded-2xl bg-bg-secondary-light dark:bg-bg-secondary-dark">
              <h3 className="font-bold mb-1">{t.term}</h3>
              <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-1">{t.category}</p>
              <p className="text-sm whitespace-pre-line">{t.body}</p>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 5: 빌드 + Commit**

Run: `cd MoneyProject && npx tsc --noEmit`

```bash
git add MoneyProject/src/lib/glossary/ MoneyProject/src/app/[basePath]/glossary/ MoneyProject/src/lib/strings/ko.ts
git commit -m "feat(glossary): add /glossary page with 30 terms in 5 categories"
```

> **Note:** glossary 페이지는 `[basePath]` 폴더 안에 두지만 `params.basePath`를 사용하지 않음 (네비 링크 일관성을 위해). 필요 시 page.tsx 시그니처에서 `params` 받기는 그대로 유지.

---

## Phase G — Integration

### Task 16: SideNav 4개 링크 + Footer 용어집 링크

**Files:**
- Modify: `MoneyProject/src/components/layout/SideNav.tsx`
- Modify: `MoneyProject/src/components/layout/Footer.tsx`
- Modify: `MoneyProject/src/lib/strings/ko.ts` — Footer 키

- [ ] **Step 1: Add Footer string**

```typescript
  // 기존 legal 섹션에 추가
  glossaryLinkLabel: '📘 용어집'
```

(또는 `footer` 섹션을 새로 만듦. 기존 `legal.disclaimer` 옆에 추가하기 위해 별도 섹션 권장)

```typescript
  footer: {
    glossaryLinkLabel: '📘 용어집'
  },
```

- [ ] **Step 2: SideNav 수정**

`MoneyProject/src/components/layout/SideNav.tsx`의 `<div className="space-y-1 flex-1">` 안 링크 4개를 다음으로 교체:

```typescript
<div className="space-y-1 flex-1">
  <Link href={`/${basePath}/recommendations`} onClick={() => setOpen(false)} className={linkClass(!!isActive('/recommendations'))}>
    💡 <span>구매 추천 일괄</span>
  </Link>
  <Link href={`/${basePath}/beginner`} onClick={() => setOpen(false)} className={linkClass(!!isActive('/beginner'))}>
    🌱 <span>{strings.beginner.linkLabel}</span>
  </Link>
  <Link href={`/${basePath}/watchlist`} onClick={() => setOpen(false)} className={linkClass(!!isActive('/watchlist'))}>
    ⭐ <span>{strings.watchlist.linkLabel}</span>
  </Link>
  <Link href={`/${basePath}/portfolio`} onClick={() => setOpen(false)} className={linkClass(!!isActive('/portfolio'))}>
    💼 <span>{strings.portfolio.linkLabel}</span>
  </Link>
  <Link href={`/${basePath}/heatmap`} onClick={() => setOpen(false)} className={linkClass(!!isActive('/heatmap'))}>
    🗺 <span>{strings.heatmap.linkLabel}</span>
  </Link>
  <Link href={`/${basePath}/journal`} onClick={() => setOpen(false)} className={linkClass(!!isActive('/journal'))}>
    📓 <span>{strings.journal.linkLabel}</span>
  </Link>
  <Link href={`/${basePath}/screener`} onClick={() => setOpen(false)} className={linkClass(!!isActive('/screener'))}>
    📊 <span>전략 검색기</span>
  </Link>
  <Link href={`/${basePath}/stocks`} onClick={() => setOpen(false)} className={linkClass(!!isActive('/stocks'))}>
    📋 <span>전체 종목</span>
  </Link>
</div>
```

- [ ] **Step 3: Footer 수정**

`MoneyProject/src/components/layout/Footer.tsx`를 다음으로 교체:

```typescript
import Link from 'next/link'
import { strings } from '@/lib/strings/ko'

export default function Footer({ basePath = '' }: { basePath?: string }) {
  return (
    <footer className="mt-12 pb-[120px] px-4 text-xs text-text-secondary-light dark:text-text-secondary-dark">
      <div className="max-w-6xl mx-auto leading-relaxed">
        <div className="mb-3">
          <Link href={`/${basePath}/glossary`} className="underline">
            {strings.footer.glossaryLinkLabel}
          </Link>
        </div>
        {strings.legal.disclaimer}
      </div>
    </footer>
  )
}
```

> **호환성**: 기존 호출처(`<Footer />` 인자 없음)도 정상 동작. basePath가 없으면 `/glossary`로 이동(루트 라우팅에 따라 404 가능 — Phase G 완료 후 모든 페이지에서 `<Footer basePath={params.basePath} />` 형태로 점진적 업데이트할 것).

기존 페이지 중 `Footer`를 호출하는 페이지를 모두 찾아 `basePath` 전달:

Run: `Grep '<Footer' MoneyProject/src --type tsx` 후 각 호출처에 `basePath={params.basePath}` 추가.

- [ ] **Step 4: 빌드 + 수동 검증**

Run: `cd MoneyProject && npx tsc --noEmit`

수동:
1. SideNav 열기 → 8개 링크 표시
2. 각 링크 클릭 → 해당 페이지 정상 표시
3. Footer에 용어집 링크 표시·동작
4. 다크 모드 정상

- [ ] **Step 5: Commit**

```bash
git add MoneyProject/src/components/layout/SideNav.tsx MoneyProject/src/components/layout/Footer.tsx MoneyProject/src/lib/strings/ko.ts MoneyProject/src/app/[basePath]/
git commit -m "feat(nav): add 4 new categories to SideNav + glossary link to Footer"
```

---

### Task 17: Export/Import UI

**Files:**
- Create: `MoneyProject/src/components/common/DataExportImport.tsx`
- Test:   `MoneyProject/src/components/common/__tests__/DataExportImport.test.tsx`
- Modify: `MoneyProject/src/components/layout/Header.tsx` — 내보내기/가져오기 버튼 추가
- Modify: `MoneyProject/src/lib/strings/ko.ts` — `dataIO` 섹션

- [ ] **Step 1: Add strings**

```typescript
  dataIO: {
    menuLabel: '데이터',
    exportButton: '내보내기 (JSON)',
    importButton: '가져오기 (JSON)',
    exportSuccess: '내려받기가 시작되었습니다',
    importConfirm: '기존 데이터를 덮어씁니다. 계속할까요?',
    importSuccess: '가져오기 완료',
    importInvalid: '유효하지 않은 파일입니다'
  },
```

- [ ] **Step 2: DataExportImport 컴포넌트**

```typescript
// DataExportImport.tsx
'use client'
import { useRef } from 'react'
import { strings } from '@/lib/strings/ko'

const KEYS = ['ws:watchlist:anon', 'ws:portfolio:anon', 'ws:journal:anon']

export default function DataExportImport() {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    const dump: Record<string, unknown> = {}
    for (const key of KEYS) {
      const raw = window.localStorage.getItem(key)
      if (raw) dump[key] = JSON.parse(raw)
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `money-screener-data-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!window.confirm(strings.dataIO.importConfirm)) return

    try {
      const text = await file.text()
      const data = JSON.parse(text) as Record<string, unknown>
      let count = 0
      for (const key of KEYS) {
        if (key in data) {
          window.localStorage.setItem(key, JSON.stringify(data[key]))
          count++
        }
      }
      if (count === 0) {
        window.alert(strings.dataIO.importInvalid)
      } else {
        window.alert(strings.dataIO.importSuccess)
        window.location.reload()
      }
    } catch {
      window.alert(strings.dataIO.importInvalid)
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex gap-2 text-sm">
      <button type="button" onClick={handleExport}
        className="px-3 py-1 rounded-full bg-bg-secondary-light dark:bg-bg-secondary-dark">
        {strings.dataIO.exportButton}
      </button>
      <button type="button" onClick={() => inputRef.current?.click()}
        className="px-3 py-1 rounded-full bg-bg-secondary-light dark:bg-bg-secondary-dark">
        {strings.dataIO.importButton}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImport}
      />
    </div>
  )
}
```

- [ ] **Step 3: Test**

```typescript
// DataExportImport.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import DataExportImport from '../DataExportImport'

describe('DataExportImport', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders both buttons', () => {
    render(<DataExportImport />)
    expect(screen.getByText('내보내기 (JSON)')).toBeInTheDocument()
    expect(screen.getByText('가져오기 (JSON)')).toBeInTheDocument()
  })

  it('export does not throw when localStorage empty', () => {
    render(<DataExportImport />)
    expect(() => fireEvent.click(screen.getByText('내보내기 (JSON)'))).not.toThrow()
  })
})
```

Run: `cd MoneyProject && npx vitest run src/components/common/__tests__/DataExportImport.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 4: Header에 통합**

Read `MoneyProject/src/components/layout/Header.tsx` 후, 적절한 위치(예: 우측 액션 영역 SideNav 버튼 근처)에 다음 import + 컴포넌트 추가:

```typescript
import DataExportImport from '@/components/common/DataExportImport'
// ...
<DataExportImport />
```

(좁은 화면에선 Header 공간 부족할 수 있음. 만약 그렇다면 SideNav 안 footer 영역에 배치하는 대안도 가능. 우선 Header 우측 시도.)

- [ ] **Step 5: 빌드 + 수동 검증 + Commit**

Run: `cd MoneyProject && npx tsc --noEmit`

수동: watchlist에 2개 추가 → 내보내기 → 다운로드 파일 확인 → localStorage 지우고 가져오기 → 복원 확인.

```bash
git add MoneyProject/src/components/common/DataExportImport.tsx MoneyProject/src/components/common/__tests__/DataExportImport.test.tsx MoneyProject/src/components/layout/Header.tsx MoneyProject/src/lib/strings/ko.ts
git commit -m "feat(data): add JSON export/import for localStorage data"
```

---

### Task 18: 사전 QA 시나리오 + 회귀 테스트

**Files:**
- 변경 없음 (수동 QA만 수행 후 발견된 이슈 수정)

- [ ] **Step 1: 전체 테스트 실행**

Run: `cd MoneyProject && npx vitest run`
Expected: 모든 기존 테스트 + 신규 테스트 PASS

- [ ] **Step 2: 빌드 확인**

Run: `cd MoneyProject && npm run build`
Expected: 성공

- [ ] **Step 3: 수동 QA 체크리스트**

- [ ] **공통**
  - [ ] 4개 신규 페이지 모두 다크 모드 정상
  - [ ] 모든 페이지 하단 여백 120px 확보
  - [ ] 모든 신규 페이지 첫 방문 시 가이드 모달 → "다시 보지 않기" 동작
  - [ ] 모바일 너비 (375px)에서 레이아웃 깨짐 없음
- [ ] **⭐ 지켜볼 종목**
  - [ ] 종목 상세 ☆ 토글 → /watchlist 반영
  - [ ] 정렬 4종 동작 (추가순 / 오른순 / 내린순 / 가나다순)
  - [ ] 🗑 → confirm → 삭제
  - [ ] 빈 상태 안내 표시
- [ ] **💼 내가 산 주식**
  - [ ] 추가 모달 → 종목 검색 → 저장 → 카드 표시
  - [ ] 요약 카드 손익 계산 검증
  - [ ] 수정 / 삭제
  - [ ] 가격 정보 없는 종목 "현재 가격 정보가 없어요"
- [ ] **🗺 오늘 잘 나가는 분야**
  - [ ] Top 5 / Bottom 5 막대 표시
  - [ ] 분야 클릭 → 종목 리스트 표시 → 종목 클릭 → 상세 이동
  - [ ] 색상·막대 길이 비례 정확
- [ ] **📓 내 거래 일기**
  - [ ] 매수/매도 기록 추가 → 카드 표시
  - [ ] 매도 시 profit 입력 → 월별 요약 win/loss 카운트 반영
  - [ ] 필터 3종 (전체/매수만/매도만) 동작
  - [ ] 수정 / 삭제
- [ ] **📘 용어집**
  - [ ] 카테고리 필터 6개 동작
  - [ ] 검색 (term + body 부분 일치) 동작
  - [ ] 30개 용어 모두 표시
- [ ] **데이터 Export/Import**
  - [ ] 내보내기 → JSON 파일 다운로드
  - [ ] 가져오기 → confirm → 복원 → 페이지 새로고침
  - [ ] 잘못된 파일 → "유효하지 않은 파일입니다"
- [ ] **회귀 검증** (기존 기능)
  - [ ] 구매 추천 일괄 / 입문 추천 / 전략 검색기 / 전체 종목 / 종목 상세 정상 동작
  - [ ] 로그인·로그아웃 정상

- [ ] **Step 4: 발견된 이슈 수정 및 별도 commit**

수정 사항이 있으면 작은 단위로 commit 후 다시 QA.

- [ ] **Step 5: PR 생성**

Run:
```bash
git push -u origin feature/phase-12-trader-categories
gh pr create --title "Phase 12: 초보자 친화 카테고리 4개 + 용어집 + 가이드" --body "$(cat <<'EOF'
## Summary
- ⭐ 지켜볼 종목 / 💼 내가 산 주식 / 🗺 오늘 잘 나가는 분야 / 📓 내 거래 일기 4개 카테고리 신규
- 📘 용어집 (30개 용어) 추가
- 첫 방문 가이드 모달
- localStorage 기반 데이터 + JSON Export/Import
- 외부 차트 라이브러리 0개 추가 (div + Tailwind 막대)

## Test plan
- [x] 전체 vitest 통과
- [x] npm run build 성공
- [x] 수동 QA 체크리스트 (계획서 Task 18) 완료
EOF
)"
```

> 사용자가 `머지/푸시 전 확인` 규칙(CLAUDE.md)이므로 push/PR은 사용자에게 확인 받은 후 실행한다.

---

## Self-Review Checklist (계획 검토 — 작성자 확인용)

**Spec coverage:**
- ✅ 관심종목 → Tasks 4–6
- ✅ 내가 산 주식 → Tasks 7–9
- ✅ 오늘 잘 나가는 분야 → Tasks 13–14
- ✅ 내 거래 일기 → Tasks 10–12
- ✅ 용어집 → Task 15
- ✅ 첫 방문 가이드 → Tasks 2–3 + 각 페이지 통합
- ✅ 공용 useLocalStore → Task 1
- ✅ JSON Export/Import → Task 17
- ✅ SideNav 4개 + Footer 용어집 → Task 16
- ✅ 모든 strings ko.ts 편입 → 각 Task에 명시
- ✅ 하단 여백 120px → 기존 Footer가 이미 `pb-[120px]` 보유

**Placeholder scan:** 없음. 각 step 코드 완전.

**Type consistency:**
- `WatchlistStore` / `PortfolioStore` / `JournalStore` 모두 일관된 `entries` 필드
- `loadIndicators` / `loadStocks` / `loadFundamentals` / `loadSectors` 함수명은 Task 9, 14에서 사용 — 실제 `dataLoader.ts`에 없으면 추가 필요(Step 안내됨)
- `FirstVisitGuide` props 시그니처 통일 (`steps`, `onDismiss`)
- `useLocalStore<T>` 시그니처가 모든 호출처에서 동일

**알려진 의존:** `loadStocks` 함수는 Task 3.5에서 dataLoader에 추가. 다른 loader는 모두 기존 함수 (tradeDate 인자 필수, `loadUpdatedAt` 선행 호출).
