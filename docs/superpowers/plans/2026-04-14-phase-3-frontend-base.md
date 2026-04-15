# Phase 3 — 프런트엔드 기반 (레이아웃·테마·모드 토글) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 공통 헤더·푸터·테마 전환·모드 전환·데이터 최신성 배너·로그아웃 버튼을 구축하여 Phase 4+에서 쓸 UI 셸을 완성한다.

**Architecture:** Zustand 스토어로 mode(beginner/expert)·theme(light/dark) 상태 관리 + localStorage 동기화. `<html class="dark">` 클래스 토글로 Tailwind dark 모드 활성화. 모든 텍스트는 `strings/ko.ts` 중앙 관리.

**Tech Stack:** Next.js 14 App Router + Zustand + Tailwind + TypeScript

**Branch:** `feature/phase-3-frontend-base` (Phase 2 브랜치에서 분기)

**Prerequisite:** Phase 2 완료 (middleware, login, auth utilities)

---

## 📁 File Structure

### 생성 파일

**상태 관리**
- `src/store/useAppStore.ts` — Zustand store (mode, theme)

**프로바이더**
- `src/components/providers/ThemeProvider.tsx` — 최초 로드 시 localStorage → html.dark 적용
- `src/components/providers/ModeProvider.tsx` — mode 초기화 (localStorage 동기화)

**헤더 컴포넌트**
- `src/components/layout/Header.tsx` — 로고 + 토글들 + 로그아웃 버튼 (Server Component 감싸는 컨테이너)
- `src/components/layout/ModeToggle.tsx` — 초보/전문가 스위치 (Client)
- `src/components/layout/ThemeToggle.tsx` — 라이트/다크 스위치 (Client)
- `src/components/layout/UpdatedAtBadge.tsx` — 데이터 갱신 시각 배지 (Client)
- `src/components/layout/LogoutButton.tsx` — 로그아웃 버튼 (Client)
- `src/components/layout/Footer.tsx` — 법적 고지

**데이터 로더**
- `src/lib/dataLoader.ts` — updated_at.json fetch 유틸

**업데이트 파일**
- `src/app/[basePath]/layout.tsx` — Providers + Header + Footer 감싸기 (기존 파일 수정)
- `src/app/[basePath]/screener/page.tsx` — 임시 스텁 (Phase 4에서 본격 구현)

**테스트**
- `src/store/__tests__/useAppStore.test.ts`
- `src/lib/__tests__/dataLoader.test.ts`

**문자열 업데이트**
- `src/lib/strings/ko.ts` — 스크리너 placeholder 추가 (Phase 4 대비)

---

## Task 1: 브랜치 생성 + Zustand 의존성

- [ ] **Step 1: 브랜치 생성** (feature/phase-2-auth 위에서 분기)

```bash
cd c:/Users/rk454/Desktop/Project/Money/MoneyProject
git checkout feature/phase-2-auth
git checkout -b feature/phase-3-frontend-base
```

- [ ] **Step 2: Zustand 설치**

```bash
npm install zustand@^4.5.4
```

- [ ] **Step 3: package.json 버전 확인**

`dependencies`에 `zustand` 추가됨 확인.

- [ ] **Step 4: 커밋**

```bash
git add package.json package-lock.json
git commit -m "feat(phase-3): add zustand state management"
```

---

## Task 2: useAppStore (Zustand) TDD

**Files:**
- Create: `src/store/useAppStore.ts`, `src/store/__tests__/useAppStore.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// src/store/__tests__/useAppStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../useAppStore'

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset state
    useAppStore.setState({ mode: 'beginner', theme: 'light' })
    localStorage.clear()
  })

  it('default mode is beginner', () => {
    expect(useAppStore.getState().mode).toBe('beginner')
  })

  it('default theme is light', () => {
    expect(useAppStore.getState().theme).toBe('light')
  })

  it('setMode changes mode and persists to localStorage', () => {
    useAppStore.getState().setMode('expert')
    expect(useAppStore.getState().mode).toBe('expert')
    expect(localStorage.getItem('app-mode')).toBe('expert')
  })

  it('setTheme changes theme and persists to localStorage', () => {
    useAppStore.getState().setTheme('dark')
    expect(useAppStore.getState().theme).toBe('dark')
    expect(localStorage.getItem('app-theme')).toBe('dark')
  })

  it('hydrate loads mode and theme from localStorage', () => {
    localStorage.setItem('app-mode', 'expert')
    localStorage.setItem('app-theme', 'dark')
    useAppStore.getState().hydrate()
    expect(useAppStore.getState().mode).toBe('expert')
    expect(useAppStore.getState().theme).toBe('dark')
  })

  it('hydrate ignores invalid localStorage values', () => {
    localStorage.setItem('app-mode', 'invalid')
    localStorage.setItem('app-theme', 'purple')
    useAppStore.getState().hydrate()
    expect(useAppStore.getState().mode).toBe('beginner')
    expect(useAppStore.getState().theme).toBe('light')
  })
})
```

- [ ] **Step 2: 실패 확인**

```bash
npm test src/store/__tests__/useAppStore.test.ts
```
Expected: FAIL (module not found).

- [ ] **Step 3: 구현**

```typescript
// src/store/useAppStore.ts
import { create } from 'zustand'
import type { ModeKey } from '@/lib/types/presets'

export type ThemeKey = 'light' | 'dark'

interface AppState {
  mode: ModeKey
  theme: ThemeKey
  setMode: (m: ModeKey) => void
  setTheme: (t: ThemeKey) => void
  hydrate: () => void
}

const MODE_KEY = 'app-mode'
const THEME_KEY = 'app-theme'

function isValidMode(v: unknown): v is ModeKey {
  return v === 'beginner' || v === 'expert'
}
function isValidTheme(v: unknown): v is ThemeKey {
  return v === 'light' || v === 'dark'
}

export const useAppStore = create<AppState>((set) => ({
  mode: 'beginner',
  theme: 'light',
  setMode: (m) => {
    if (typeof window !== 'undefined') localStorage.setItem(MODE_KEY, m)
    set({ mode: m })
  },
  setTheme: (t) => {
    if (typeof window !== 'undefined') localStorage.setItem(THEME_KEY, t)
    set({ theme: t })
  },
  hydrate: () => {
    if (typeof window === 'undefined') return
    const savedMode = localStorage.getItem(MODE_KEY)
    const savedTheme = localStorage.getItem(THEME_KEY)
    const mode = isValidMode(savedMode) ? savedMode : 'beginner'
    const theme = isValidTheme(savedTheme) ? savedTheme : 'light'
    set({ mode, theme })
  }
}))
```

- [ ] **Step 4: 통과 확인** — 6개 테스트 PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/store/
git commit -m "feat(phase-3): add Zustand store for mode and theme"
```

---

## Task 3: ThemeProvider + ModeProvider

**Files:**
- Create: `src/components/providers/ThemeProvider.tsx`, `src/components/providers/ModeProvider.tsx`

- [ ] **Step 1: ThemeProvider 작성**

```tsx
// src/components/providers/ThemeProvider.tsx
'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((s) => s.theme)
  const hydrate = useAppStore((s) => s.hydrate)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return <>{children}</>
}
```

- [ ] **Step 2: ModeProvider 작성** — (현재는 stub. hydrate를 ThemeProvider가 수행하므로 별도 로직 없음)

```tsx
// src/components/providers/ModeProvider.tsx
'use client'

export default function ModeProvider({ children }: { children: React.ReactNode }) {
  // Mode state is managed by useAppStore + ThemeProvider hydration.
  // This wrapper exists for layout semantic symmetry and future extension.
  return <>{children}</>
}
```

- [ ] **Step 3: type-check**

```bash
npm run type-check
```
Expected: pass.

- [ ] **Step 4: 커밋**

```bash
git add src/components/providers/
git commit -m "feat(phase-3): add ThemeProvider and ModeProvider"
```

---

## Task 4: ModeToggle + ThemeToggle 컴포넌트

**Files:**
- Create: `src/components/layout/ModeToggle.tsx`, `src/components/layout/ThemeToggle.tsx`

- [ ] **Step 1: ModeToggle 작성**

```tsx
// src/components/layout/ModeToggle.tsx
'use client'

import { useAppStore } from '@/store/useAppStore'
import { strings } from '@/lib/strings/ko'

export default function ModeToggle() {
  const mode = useAppStore((s) => s.mode)
  const setMode = useAppStore((s) => s.setMode)

  return (
    <button
      type="button"
      role="switch"
      aria-checked={mode === 'expert'}
      aria-label={strings.mode.toggle_aria}
      onClick={() => setMode(mode === 'beginner' ? 'expert' : 'beginner')}
      className="inline-flex items-center gap-2 px-3 py-1 text-sm rounded-full border border-border-light dark:border-border-dark hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark"
    >
      <span className={mode === 'beginner' ? 'font-bold' : 'text-text-secondary-light dark:text-text-secondary-dark'}>
        {strings.mode.beginner}
      </span>
      <span aria-hidden className="text-text-secondary-light dark:text-text-secondary-dark">/</span>
      <span className={mode === 'expert' ? 'font-bold' : 'text-text-secondary-light dark:text-text-secondary-dark'}>
        {strings.mode.expert}
      </span>
    </button>
  )
}
```

- [ ] **Step 2: ThemeToggle 작성**

```tsx
// src/components/layout/ThemeToggle.tsx
'use client'

import { useAppStore } from '@/store/useAppStore'
import { strings } from '@/lib/strings/ko'

export default function ThemeToggle() {
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)

  return (
    <button
      type="button"
      role="switch"
      aria-checked={theme === 'dark'}
      aria-label={strings.theme.toggle_aria}
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-border-light dark:border-border-dark hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark"
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}
```

- [ ] **Step 3: type-check + commit**

```bash
npm run type-check
git add src/components/layout/ModeToggle.tsx src/components/layout/ThemeToggle.tsx
git commit -m "feat(phase-3): add ModeToggle and ThemeToggle components"
```

---

## Task 5: dataLoader + UpdatedAtBadge (TDD for formatter)

**Files:**
- Create: `src/lib/dataLoader.ts`, `src/lib/__tests__/dataLoader.test.ts`, `src/components/layout/UpdatedAtBadge.tsx`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// src/lib/__tests__/dataLoader.test.ts
import { describe, it, expect } from 'vitest'
import { getFreshnessLevel, formatRelative } from '../dataLoader'

describe('getFreshnessLevel', () => {
  const now = new Date('2026-04-14T18:00:00+09:00').getTime()

  it('returns fresh within 24h', () => {
    const updated = now - 5 * 60 * 60 * 1000
    expect(getFreshnessLevel(updated, now)).toBe('fresh')
  })

  it('returns stale24h between 24h and 48h', () => {
    const updated = now - 30 * 60 * 60 * 1000
    expect(getFreshnessLevel(updated, now)).toBe('stale24h')
  })

  it('returns stale48h beyond 48h', () => {
    const updated = now - 72 * 60 * 60 * 1000
    expect(getFreshnessLevel(updated, now)).toBe('stale48h')
  })

  it('boundary: exactly 24h is still fresh', () => {
    const updated = now - 24 * 60 * 60 * 1000
    expect(getFreshnessLevel(updated, now)).toBe('fresh')
  })
})

describe('formatRelative', () => {
  const now = new Date('2026-04-14T18:00:00+09:00').getTime()

  it('minutes ago', () => {
    const updated = now - 10 * 60 * 1000
    expect(formatRelative(updated, now)).toBe('10분 전')
  })

  it('hours ago', () => {
    const updated = now - 3 * 60 * 60 * 1000
    expect(formatRelative(updated, now)).toBe('3시간 전')
  })

  it('days ago', () => {
    const updated = now - 2 * 24 * 60 * 60 * 1000
    expect(formatRelative(updated, now)).toBe('2일 전')
  })

  it('just now for less than 1 minute', () => {
    const updated = now - 30 * 1000
    expect(formatRelative(updated, now)).toBe('방금 전')
  })
})
```

- [ ] **Step 2: 실패 확인**

- [ ] **Step 3: dataLoader.ts 구현**

```typescript
// src/lib/dataLoader.ts
import type { UpdatedAtJson } from '@/lib/types/indicators'

export type FreshnessLevel = 'fresh' | 'stale24h' | 'stale48h'

const H24_MS = 24 * 60 * 60 * 1000
const H48_MS = 48 * 60 * 60 * 1000

export function getFreshnessLevel(updatedAtMs: number, nowMs: number): FreshnessLevel {
  const diff = nowMs - updatedAtMs
  if (diff > H48_MS) return 'stale48h'
  if (diff > H24_MS) return 'stale24h'
  return 'fresh'
}

export function formatRelative(updatedAtMs: number, nowMs: number): string {
  const diffSec = Math.floor((nowMs - updatedAtMs) / 1000)
  if (diffSec < 60) return '방금 전'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}분 전`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}시간 전`
  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay}일 전`
}

export async function loadUpdatedAt(): Promise<UpdatedAtJson | null> {
  try {
    const res = await fetch('/data/updated_at.json', { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as UpdatedAtJson
  } catch {
    return null
  }
}
```

- [ ] **Step 4: 테스트 통과 확인** — 8개 PASS.

- [ ] **Step 5: UpdatedAtBadge 작성**

```tsx
// src/components/layout/UpdatedAtBadge.tsx
'use client'

import { useEffect, useState } from 'react'
import { loadUpdatedAt, getFreshnessLevel, formatRelative } from '@/lib/dataLoader'
import { strings } from '@/lib/strings/ko'

type Status = 'loading' | 'fresh' | 'stale24h' | 'stale48h' | 'missing'

export default function UpdatedAtBadge() {
  const [status, setStatus] = useState<Status>('loading')
  const [relative, setRelative] = useState<string>('')

  useEffect(() => {
    loadUpdatedAt().then((data) => {
      if (!data) { setStatus('missing'); return }
      const now = Date.now()
      const updated = new Date(data.updated_at).getTime()
      setStatus(getFreshnessLevel(updated, now))
      setRelative(formatRelative(updated, now))
    })
  }, [])

  if (status === 'loading') return null
  if (status === 'missing') return null

  const dot = status === 'fresh' ? '🟢' : status === 'stale24h' ? '🟡' : '🔴'
  const label =
    status === 'fresh' ? strings.dataStatus.updatedAt(relative) :
    status === 'stale24h' ? strings.dataStatus.stale24h :
    strings.dataStatus.stale48h

  return (
    <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark inline-flex items-center gap-1">
      <span aria-hidden>{dot}</span>
      <span>{label}</span>
    </span>
  )
}
```

- [ ] **Step 6: type-check + commit**

```bash
npm run type-check
git add src/lib/dataLoader.ts src/lib/__tests__/dataLoader.test.ts src/components/layout/UpdatedAtBadge.tsx
git commit -m "feat(phase-3): add dataLoader and UpdatedAtBadge"
```

---

## Task 6: LogoutButton + Header + Footer

**Files:**
- Create: `src/components/layout/LogoutButton.tsx`, `src/components/layout/Header.tsx`, `src/components/layout/Footer.tsx`

- [ ] **Step 1: LogoutButton**

```tsx
// src/components/layout/LogoutButton.tsx
'use client'

import { useState } from 'react'
import { strings } from '@/lib/strings/ko'

export default function LogoutButton() {
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (data?.redirect) {
        window.location.href = data.redirect
      } else {
        window.location.reload()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="text-sm px-3 py-1 rounded-md border border-border-light dark:border-border-dark hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark disabled:opacity-50"
    >
      {loading ? strings.common.loading : strings.common.logout}
    </button>
  )
}
```

- [ ] **Step 2: Header**

```tsx
// src/components/layout/Header.tsx
import ModeToggle from './ModeToggle'
import ThemeToggle from './ThemeToggle'
import UpdatedAtBadge from './UpdatedAtBadge'
import LogoutButton from './LogoutButton'
import { strings } from '@/lib/strings/ko'

export default function Header() {
  return (
    <header className="sticky top-0 z-10 bg-bg-primary-light dark:bg-bg-primary-dark border-b border-border-light dark:border-border-dark">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg">{strings.app.title}</span>
          <UpdatedAtBadge />
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Footer**

```tsx
// src/components/layout/Footer.tsx
import { strings } from '@/lib/strings/ko'

export default function Footer() {
  return (
    <footer className="mt-12 pb-[120px] px-4 text-xs text-text-secondary-light dark:text-text-secondary-dark">
      <div className="max-w-6xl mx-auto leading-relaxed">
        {strings.legal.disclaimer}
      </div>
    </footer>
  )
}
```

- [ ] **Step 4: type-check + commit**

```bash
npm run type-check
git add src/components/layout/
git commit -m "feat(phase-3): add Header, Footer, LogoutButton components"
```

---

## Task 7: [basePath]/layout.tsx 업데이트 + 스크리너 스텁

**Files:**
- Modify: `src/app/[basePath]/layout.tsx`
- Create: `src/app/[basePath]/screener/page.tsx`

- [ ] **Step 1: [basePath]/layout.tsx 수정**

```tsx
// src/app/[basePath]/layout.tsx
import { notFound } from 'next/navigation'
import ThemeProvider from '@/components/providers/ThemeProvider'
import ModeProvider from '@/components/providers/ModeProvider'

export default function SecretLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: { basePath: string }
}) {
  const expected = process.env.SECRET_BASE_PATH
  if (!expected || params.basePath !== expected) {
    notFound()
  }
  return (
    <ThemeProvider>
      <ModeProvider>
        {children}
      </ModeProvider>
    </ThemeProvider>
  )
}
```

**주의**: 로그인 페이지에는 Header를 표시하지 않음. Header는 로그인 후 화면에서만 사용. 그래서 각 페이지가 필요에 따라 Header/Footer를 import하여 감싸는 방식을 사용.

- [ ] **Step 2: screener 스텁 생성**

```tsx
// src/app/[basePath]/screener/page.tsx
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { strings } from '@/lib/strings/ko'

export default function ScreenerPage() {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 min-h-[60vh]">
        <h2 className="text-xl font-bold mb-4">
          {strings.screener.beginnerTitle}
        </h2>
        <p className="text-text-secondary-light dark:text-text-secondary-dark">
          Phase 4에서 프리셋 필터링 결과가 여기에 표시됩니다.
        </p>
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 3: type-check + build**

```bash
npm run type-check
npm run build
```
Expected: pass, `ƒ /[basePath]/screener` 라우트 등록.

- [ ] **Step 4: 커밋**

```bash
git add src/app/[basePath]/layout.tsx src/app/[basePath]/screener/
git commit -m "feat(phase-3): wire providers into layout and add screener stub"
```

---

## Task 8: 전체 테스트 + Workprogress

- [ ] **Step 1: 전체 테스트 실행**

```bash
npm test
```
Expected: 모든 기존 테스트(16) + 신규(14) = **총 30/30 PASS**.

- [ ] **Step 2: 빌드 전체 확인**

```bash
npm run build
```
Expected: 빌드 성공.

- [ ] **Step 3: Workprogress 기록**

`Workprogress/Phase_3_2026-04-14.md`:
```markdown
# Phase 3 — 프런트엔드 기반

Phase: 3
Status: 코드 완료 (시각적 E2E 수동 확인 대기)
LastUpdate: 2026-04-14
Branch: feature/phase-3-frontend-base

RecentWork:
  - Zustand store (mode/theme + localStorage)
  - ThemeProvider/ModeProvider
  - ModeToggle/ThemeToggle 컴포넌트
  - UpdatedAtBadge + dataLoader (TDD)
  - LogoutButton + Header + Footer
  - [basePath]/layout.tsx에 프로바이더 연결
  - screener 스텁 페이지

ResolvedWork:
  - Task 1~7

MainIssues:
  - 시각적 검증 (테마 전환, 모드 전환이 실제 브라우저에서 동작하는지)

RelatedPhases:
  - Phase 2 (로그인·middleware)
  - Phase 4 (screener 본체 구현)

CommitLog: (실제 SHA는 커밋 후 업데이트)
```

- [ ] **Step 4: 커밋 + 푸시 확인 대기**

```bash
git add Workprogress/Phase_3_2026-04-14.md
git commit -m "docs(phase-3): add Phase 3 workprogress record"
```

사용자 확인 후 push.

---

## 🏁 Phase 3 완료 조건

- [ ] 모든 Task 체크
- [ ] Vitest 30/30 PASS
- [ ] type-check/build 에러 0
- [ ] Workprogress 기록
- [ ] 사용자 확인 후 push + PR
