# Phase 5 — 초보 모드 + 개별 종목 분석 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** 초보/전문가 모드 토글에 따라 화면을 전환하고, 개별 종목을 클릭하면 상세 분석 페이지(차트 + 지표 수치 + 매칭된 프리셋)로 이동한다.

**Architecture:** `useAppStore.mode`를 구독해 `BeginnerScreener`/`ExpertScreener` 조건부 렌더링. 결과 테이블 행은 `Link`로 `/stock/[code]`로 이동. 개별 페이지는 TradingView Lightweight Charts로 캔들+이평선+BB 차트 렌더링.

**Tech Stack:** Next.js 14 + Zustand + TradingView Lightweight Charts + TypeScript

**Branch:** `feature/phase-5-beginner-stock-detail`

**Prerequisite:** Phase 4 완료

---

## 📁 File Structure

**초보 모드**
- `src/app/[basePath]/screener/BeginnerScreener.tsx` — 카드 뷰 컨테이너
- `src/components/screener/RecommendCard.tsx` — 개별 추천 카드

**개별 종목 페이지**
- `src/app/[basePath]/stock/[code]/page.tsx` — Server shell
- `src/app/[basePath]/stock/[code]/StockDetail.tsx` — Client container
- `src/components/stock/StockChart.tsx` — TradingView 차트
- `src/components/stock/IndicatorTable.tsx` — 지표 수치 테이블
- `src/components/stock/FundamentalTable.tsx` — PBR/PER/수급
- `src/components/stock/MatchedPresets.tsx` — 매칭 프리셋 목록
- `src/components/stock/BeginnerGuide.tsx` — 초보용 해설 + 매수 가이드

**라우팅 업데이트**
- `src/app/[basePath]/screener/page.tsx` — mode 기반 조건부 렌더

**문자열 추가**
- `src/lib/strings/ko.ts` — stock 관련 추가

---

## Task 1: 브랜치 + 차트 라이브러리

- [ ] **Step 1: 브랜치**
```bash
cd c:/Users/rk454/Desktop/Project/Money/MoneyProject
git checkout feature/phase-4-expert-screener
git checkout -b feature/phase-5-beginner-stock-detail
```

- [ ] **Step 2: TradingView Lightweight Charts 설치**
```bash
npm install lightweight-charts@^4.2.0
```

- [ ] **Step 3: strings/ko.ts에 stock 관련 추가**

strings 객체에 `stock` 키 추가 (screener 다음, maintenance 앞에):
```typescript
stock: {
  backToScreener: '← 검색기로',
  currentPrice: '현재가',
  marketCap: '시가총액',
  indicators: '주요 지표',
  fundamentals: '펀더멘털',
  supply: '수급',
  matchedPresets: '매칭된 프리셋',
  noMatches: '매칭된 프리셋 없음',
  notFound: '종목을 찾을 수 없습니다',
  beginnerWhyNow: '💡 지금 관심있게 볼 이유',
  beginnerGuide: '📘 참고 가이드',
  buyTiming: '매수 타이밍',
  holdingPeriod: '보유 기간',
  stopLoss: '손절 기준',
  caution: '⚠️ 투자 판단은 본인 책임입니다'
}
```

- [ ] **Step 4: 커밋**
```bash
npm run type-check
git add package.json package-lock.json src/lib/strings/ko.ts
git commit -m "feat(phase-5): add lightweight-charts and stock detail strings"
```

---

## Task 2: 초보 모드 — RecommendCard + BeginnerScreener

### `src/components/screener/RecommendCard.tsx`
```tsx
'use client'

import Link from 'next/link'
import type { FilterResult } from '@/lib/filter'
import { useAppStore } from '@/store/useAppStore'

interface Props {
  result: FilterResult
  tagLabel: string
}

export default function RecommendCard({ result, tagLabel }: Props) {
  const mode = useAppStore((s) => s.mode)
  const basePath = (typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : '') || ''
  return (
    <Link
      href={`/${basePath}/stock/${result.code}`}
      className="block bg-bg-secondary-light dark:bg-bg-secondary-dark rounded-xl p-4 hover:shadow-md transition"
    >
      <div className="text-xs text-accent-light dark:text-accent-dark font-bold mb-1">
        🟢 {tagLabel}
      </div>
      <div className="font-bold text-base">{result.name}</div>
      <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-2">
        {result.code} · {result.market}
      </div>
      <div className="text-lg font-bold">
        {result.price?.toLocaleString() ?? '-'}원
      </div>
    </Link>
  )
}
```

### `src/app/[basePath]/screener/BeginnerScreener.tsx`
```tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import RecommendCard from '@/components/screener/RecommendCard'
import { getBeginnerPresets } from '@/lib/presets/registry'
import { runPreset, type FilterResult } from '@/lib/filter'
import { loadIndicators, loadFundamentals, loadUpdatedAt } from '@/lib/dataLoader'
import { strings } from '@/lib/strings/ko'
import type { IndicatorsJson, FundamentalsJson } from '@/lib/types/indicators'

interface TaggedResult extends FilterResult {
  presetId: string
  tagLabel: string
}

export default function BeginnerScreener() {
  const [results, setResults] = useState<TaggedResult[]>([])
  const [loading, setLoading] = useState(true)

  const presets = useMemo(() => getBeginnerPresets(), [])

  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) { setLoading(false); return }
      const [ind, fund] = await Promise.all([
        loadIndicators(u.trade_date),
        loadFundamentals(u.trade_date)
      ])
      if (!ind) { setLoading(false); return }
      const tagged: TaggedResult[] = []
      for (const preset of presets) {
        const res = runPreset(preset, ind, fund ?? {}, {})
        for (const r of res) {
          tagged.push({ ...r, presetId: preset.id, tagLabel: preset.description.beginner })
        }
      }
      // 중복 종목 제거 (같은 종목이 여러 프리셋에 매칭되면 첫 번째 태그 유지)
      const seen = new Set<string>()
      const dedup = tagged.filter((r) => {
        if (seen.has(r.code)) return false
        seen.add(r.code)
        return true
      })
      setResults(dedup.slice(0, 24))
      setLoading(false)
    })
  }, [presets])

  if (loading) return <p>{strings.common.loading}</p>
  if (results.length === 0) return <p>{strings.screener.empty}</p>

  return (
    <>
      <h2 className="text-lg font-bold mb-4">{strings.screener.beginnerTitle}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((r) => (
          <RecommendCard key={r.code} result={r} tagLabel={r.tagLabel} />
        ))}
      </div>
    </>
  )
}
```

- [ ] **Verify + commit**
```bash
npm run type-check
git add src/app/[basePath]/screener/BeginnerScreener.tsx src/components/screener/RecommendCard.tsx
git commit -m "feat(phase-5): add BeginnerScreener and RecommendCard components"
```

---

## Task 3: 모드 기반 screener 페이지 분기

### Create `src/app/[basePath]/screener/ScreenerSwitcher.tsx` (Client Component)
```tsx
'use client'

import { useAppStore } from '@/store/useAppStore'
import ExpertScreener from './ExpertScreener'
import BeginnerScreener from './BeginnerScreener'

export default function ScreenerSwitcher() {
  const mode = useAppStore((s) => s.mode)
  return mode === 'expert' ? <ExpertScreener /> : <BeginnerScreener />
}
```

### Update `src/app/[basePath]/screener/page.tsx`
```tsx
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ScreenerSwitcher from './ScreenerSwitcher'

export default function ScreenerPage() {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 min-h-[60vh]">
        <ScreenerSwitcher />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Verify + commit**
```bash
npm run type-check
npm run build
git add src/app/[basePath]/screener/
git commit -m "feat(phase-5): wire mode-based screener switcher"
```

---

## Task 4: Stock 상세 페이지 기본 구조 (Server shell + Client container)

### `src/app/[basePath]/stock/[code]/page.tsx` (Server)
```tsx
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import StockDetail from './StockDetail'

export default function StockPage({ params }: { params: { basePath: string, code: string } }) {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 min-h-[60vh]">
        <StockDetail code={params.code} basePath={params.basePath} />
      </main>
      <Footer />
    </>
  )
}
```

### `src/app/[basePath]/stock/[code]/StockDetail.tsx` (Client - stub)
```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAppStore } from '@/store/useAppStore'
import { loadIndicators, loadFundamentals, loadUpdatedAt } from '@/lib/dataLoader'
import { strings } from '@/lib/strings/ko'
import type { StockIndicators, Fundamental } from '@/lib/types/indicators'

interface Props { code: string; basePath: string }

export default function StockDetail({ code, basePath }: Props) {
  const mode = useAppStore((s) => s.mode)
  const [stock, setStock] = useState<StockIndicators | null>(null)
  const [fundamental, setFundamental] = useState<Fundamental | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) { setLoading(false); return }
      const [ind, fund] = await Promise.all([
        loadIndicators(u.trade_date),
        loadFundamentals(u.trade_date)
      ])
      const s = ind?.[code] as StockIndicators | undefined
      setStock(s ?? null)
      setFundamental(fund?.[code])
      setLoading(false)
    })
  }, [code])

  if (loading) return <p>{strings.common.loading}</p>
  if (!stock) return (
    <>
      <Link href={`/${basePath}/screener`} className="text-sm text-accent-light dark:text-accent-dark">
        {strings.stock.backToScreener}
      </Link>
      <p className="mt-4">{strings.stock.notFound}</p>
    </>
  )

  return (
    <div>
      <Link href={`/${basePath}/screener`} className="text-sm text-accent-light dark:text-accent-dark">
        {strings.stock.backToScreener}
      </Link>
      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-bold">{stock.name}</h1>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
          {code} · {stock.market}
        </p>
        <p className="text-3xl font-bold mt-2">
          {stock.close.at(-1)?.toLocaleString()}원
        </p>
      </header>
      {/* Phase 5 추가 컴포넌트들 (chart, indicator table, etc.) Task 5+에서 */}
      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
        모드: {mode === 'beginner' ? '초보' : '전문가'}
      </p>
    </div>
  )
}
```

- [ ] **Verify + commit**
```bash
npm run type-check
npm run build
git add src/app/[basePath]/stock/
git commit -m "feat(phase-5): add stock detail page shell and container"
```

---

## Task 5: StockChart (TradingView) + IndicatorTable

### `src/components/stock/StockChart.tsx`
```tsx
'use client'

import { useEffect, useRef } from 'react'
import { createChart, type IChartApi, ColorType, LineStyle } from 'lightweight-charts'
import { useAppStore } from '@/store/useAppStore'
import type { StockIndicators } from '@/lib/types/indicators'

interface Props { stock: StockIndicators }

export default function StockChart({ stock }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const theme = useAppStore((s) => s.theme)
  const mode = useAppStore((s) => s.mode)

  useEffect(() => {
    if (!containerRef.current) return
    const bg = theme === 'dark' ? '#141414' : '#FFFFFF'
    const text = theme === 'dark' ? '#F5F5F5' : '#111111'
    const grid = theme === 'dark' ? '#333333' : '#E4E4E4'

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 400,
      layout: { background: { type: ColorType.Solid, color: bg }, textColor: text },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      rightPriceScale: { borderColor: grid },
      timeScale: { borderColor: grid }
    })
    chartRef.current = chart

    // Candles
    const candle = chart.addCandlestickSeries({
      upColor: '#E53935', downColor: '#3DB351',
      borderUpColor: '#E53935', borderDownColor: '#3DB351',
      wickUpColor: '#E53935', wickDownColor: '#3DB351'
    })
    // Note: StockIndicators는 close/volume만 있음. OHLC가 없어서 close만 있는 라인 차트로 대체
    // Phase 7에서 ohlcv.json에서 OHLC를 가져와 연결
    
    const candleData = stock.dates.map((d, i) => ({
      time: d,
      open: stock.close[i],
      high: stock.close[i],
      low: stock.close[i],
      close: stock.close[i]
    }))
    candle.setData(candleData as any)

    // MA20 (전문가 모드에서만 표시되는 추가 이평선 등은 간소화)
    if (mode === 'expert') {
      const ma20Line = chart.addLineSeries({ color: '#0064FF', lineWidth: 1, lineStyle: LineStyle.Solid })
      ma20Line.setData(
        stock.dates
          .map((d, i) => ({ time: d, value: stock.ma20[i] }))
          .filter((p) => p.value != null) as any
      )
      const ma60Line = chart.addLineSeries({ color: '#E53935', lineWidth: 1 })
      ma60Line.setData(
        stock.dates
          .map((d, i) => ({ time: d, value: stock.ma60[i] }))
          .filter((p) => p.value != null) as any
      )
    } else {
      // 초보 모드: MA20만
      const ma20Line = chart.addLineSeries({ color: '#0064FF', lineWidth: 1 })
      ma20Line.setData(
        stock.dates
          .map((d, i) => ({ time: d, value: stock.ma20[i] }))
          .filter((p) => p.value != null) as any
      )
    }

    chart.timeScale().fitContent()

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [stock, theme, mode])

  return <div ref={containerRef} className="w-full h-[400px]" />
}
```

### `src/components/stock/IndicatorTable.tsx` (전문가 전용)
```tsx
import type { StockIndicators } from '@/lib/types/indicators'

export default function IndicatorTable({ stock }: { stock: StockIndicators }) {
  const last = <T,>(arr: (T | null)[]): T | null => arr.at(-1) ?? null
  const row = (label: string, value: string | number | null) => (
    <tr className="border-b border-border-light dark:border-border-dark">
      <td className="py-1 pr-4 text-text-secondary-light dark:text-text-secondary-dark">{label}</td>
      <td className="py-1 text-right font-mono text-xs">{value ?? '-'}</td>
    </tr>
  )
  const fmt = (n: number | null) => n == null ? null : n.toLocaleString()
  const fmt1 = (n: number | null) => n == null ? null : n.toFixed(1)
  return (
    <table className="w-full text-sm">
      <tbody>
        {row('MA5', fmt(last(stock.ma5)))}
        {row('MA20', fmt(last(stock.ma20)))}
        {row('MA60', fmt(last(stock.ma60)))}
        {row('MA120', fmt(last(stock.ma120)))}
        {row('RSI14', fmt1(last(stock.rsi14)))}
        {row('MACD Line', fmt1(last(stock.macd_line)))}
        {row('MACD Signal', fmt1(last(stock.macd_signal)))}
        {row('MACD Hist', fmt1(last(stock.macd_hist)))}
        {row('BB Upper', fmt(last(stock.bb_upper)))}
        {row('BB Middle', fmt(last(stock.bb_middle)))}
        {row('BB Lower', fmt(last(stock.bb_lower)))}
        {row('52주 신고가', fmt(stock.high52w))}
        {row('거래량 20일 평균', fmt(stock.vol_avg20))}
      </tbody>
    </table>
  )
}
```

- [ ] **Verify + commit**
```bash
npm run type-check
git add src/components/stock/StockChart.tsx src/components/stock/IndicatorTable.tsx
git commit -m "feat(phase-5): add StockChart (TradingView) and IndicatorTable"
```

---

## Task 6: FundamentalTable + MatchedPresets + BeginnerGuide

### `src/components/stock/FundamentalTable.tsx`
```tsx
import type { Fundamental } from '@/lib/types/indicators'

export default function FundamentalTable({ fundamental }: { fundamental: Fundamental | undefined }) {
  if (!fundamental) return <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">펀더멘털 데이터 없음</p>
  const foreignTotal = fundamental.foreign_net.slice(-5).reduce((a, b) => a + b, 0)
  const instTotal = fundamental.institution_net.slice(-5).reduce((a, b) => a + b, 0)
  return (
    <table className="w-full text-sm">
      <tbody>
        <tr className="border-b border-border-light dark:border-border-dark">
          <td className="py-1 pr-4 text-text-secondary-light dark:text-text-secondary-dark">PBR</td>
          <td className="py-1 text-right font-mono text-xs">{fundamental.pbr?.toFixed(2) ?? '-'}</td>
        </tr>
        <tr className="border-b border-border-light dark:border-border-dark">
          <td className="py-1 pr-4 text-text-secondary-light dark:text-text-secondary-dark">PER</td>
          <td className="py-1 text-right font-mono text-xs">{fundamental.per?.toFixed(2) ?? '-'}</td>
        </tr>
        <tr className="border-b border-border-light dark:border-border-dark">
          <td className="py-1 pr-4 text-text-secondary-light dark:text-text-secondary-dark">시가총액</td>
          <td className="py-1 text-right font-mono text-xs">{fundamental.market_cap.toLocaleString()}</td>
        </tr>
        <tr className="border-b border-border-light dark:border-border-dark">
          <td className="py-1 pr-4 text-text-secondary-light dark:text-text-secondary-dark">외국인 5일 누적</td>
          <td className="py-1 text-right font-mono text-xs">{foreignTotal.toLocaleString()}</td>
        </tr>
        <tr className="border-b border-border-light dark:border-border-dark">
          <td className="py-1 pr-4 text-text-secondary-light dark:text-text-secondary-dark">기관 5일 누적</td>
          <td className="py-1 text-right font-mono text-xs">{instTotal.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
  )
}
```

### `src/components/stock/MatchedPresets.tsx`
```tsx
'use client'

import { useMemo } from 'react'
import { allPresets } from '@/lib/presets/registry'
import { strings } from '@/lib/strings/ko'
import type { StockIndicators, Fundamental } from '@/lib/types/indicators'

interface Props {
  stock: StockIndicators
  fundamental: Fundamental | undefined
}

export default function MatchedPresets({ stock, fundamental }: Props) {
  const matched = useMemo(() => {
    return allPresets.filter((p) => {
      try {
        return p.filter({ stock, fundamental, params: {} })
      } catch {
        return false
      }
    })
  }, [stock, fundamental])

  if (matched.length === 0) {
    return <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{strings.stock.noMatches}</p>
  }

  return (
    <ul className="space-y-1 text-sm">
      {matched.map((p) => (
        <li key={p.id}>✅ {p.name}</li>
      ))}
    </ul>
  )
}
```

### `src/components/stock/BeginnerGuide.tsx`
```tsx
'use client'

import { useMemo } from 'react'
import { allPresets } from '@/lib/presets/registry'
import { strings } from '@/lib/strings/ko'
import type { StockIndicators, Fundamental } from '@/lib/types/indicators'

interface Props {
  stock: StockIndicators
  fundamental: Fundamental | undefined
}

export default function BeginnerGuide({ stock, fundamental }: Props) {
  const matched = useMemo(() => {
    return allPresets.filter((p) => {
      try { return p.filter({ stock, fundamental, params: {} }) } catch { return false }
    })
  }, [stock, fundamental])

  // 초보 모드용 첫 매칭 프리셋 기준 가이드
  const primary = matched[0]

  return (
    <div className="space-y-4">
      <section>
        <h3 className="font-bold text-base mb-2">{strings.stock.beginnerWhyNow}</h3>
        {matched.length > 0 ? (
          <ul className="text-sm space-y-1">
            {matched.slice(0, 3).map((p) => (
              <li key={p.id}>• {p.description.beginner}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
            현재 매칭되는 신호 없음
          </p>
        )}
      </section>

      {primary && (
        <section className="bg-bg-secondary-light dark:bg-bg-secondary-dark rounded-xl p-4">
          <h3 className="font-bold text-base mb-2">{strings.stock.beginnerGuide}</h3>
          <ul className="text-sm space-y-1">
            <li>• <strong>{strings.stock.buyTiming}:</strong> {primary.buyTiming}</li>
            <li>• <strong>{strings.stock.holdingPeriod}:</strong> {primary.holdingPeriod}</li>
            <li>• <strong>{strings.stock.stopLoss}:</strong> {primary.stopLoss}</li>
          </ul>
        </section>
      )}

      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
        {strings.stock.caution}
      </p>
    </div>
  )
}
```

- [ ] **Verify + commit**
```bash
npm run type-check
git add src/components/stock/
git commit -m "feat(phase-5): add FundamentalTable, MatchedPresets, BeginnerGuide"
```

---

## Task 7: StockDetail 최종 통합

Update `src/app/[basePath]/stock/[code]/StockDetail.tsx` — replace stub with full version:

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAppStore } from '@/store/useAppStore'
import { loadIndicators, loadFundamentals, loadUpdatedAt } from '@/lib/dataLoader'
import { strings } from '@/lib/strings/ko'
import StockChart from '@/components/stock/StockChart'
import IndicatorTable from '@/components/stock/IndicatorTable'
import FundamentalTable from '@/components/stock/FundamentalTable'
import MatchedPresets from '@/components/stock/MatchedPresets'
import BeginnerGuide from '@/components/stock/BeginnerGuide'
import type { StockIndicators, Fundamental } from '@/lib/types/indicators'

interface Props { code: string; basePath: string }

export default function StockDetail({ code, basePath }: Props) {
  const mode = useAppStore((s) => s.mode)
  const [stock, setStock] = useState<StockIndicators | null>(null)
  const [fundamental, setFundamental] = useState<Fundamental | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) { setLoading(false); return }
      const [ind, fund] = await Promise.all([
        loadIndicators(u.trade_date),
        loadFundamentals(u.trade_date)
      ])
      const s = ind?.[code] as StockIndicators | undefined
      setStock(s ?? null)
      setFundamental(fund?.[code])
      setLoading(false)
    })
  }, [code])

  if (loading) return <p>{strings.common.loading}</p>
  if (!stock) return (
    <>
      <Link href={`/${basePath}/screener`} className="text-sm text-accent-light dark:text-accent-dark">
        {strings.stock.backToScreener}
      </Link>
      <p className="mt-4">{strings.stock.notFound}</p>
    </>
  )

  const price = stock.close.at(-1)
  const prev = stock.close.at(-2)
  const change = price != null && prev != null ? price - prev : 0
  const changePct = price != null && prev != null && prev !== 0 ? (change / prev) * 100 : 0
  const changeClass = change >= 0 ? 'text-positive-light dark:text-positive-dark' : 'text-negative-light dark:text-negative-dark'

  return (
    <div>
      <Link href={`/${basePath}/screener`} className="text-sm text-accent-light dark:text-accent-dark">
        {strings.stock.backToScreener}
      </Link>
      
      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-bold">{stock.name}</h1>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
          {code} · {stock.market}
        </p>
        <div className="flex items-baseline gap-3 mt-2">
          <p className="text-3xl font-bold">{price?.toLocaleString() ?? '-'}원</p>
          {price != null && prev != null && (
            <p className={`text-sm font-bold ${changeClass}`}>
              {change >= 0 ? '+' : ''}{change.toLocaleString()} ({changePct.toFixed(2)}%)
            </p>
          )}
        </div>
      </header>

      <section className="mb-8">
        <StockChart stock={stock} />
      </section>

      {mode === 'beginner' ? (
        <BeginnerGuide stock={stock} fundamental={fundamental} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section>
            <h3 className="font-bold mb-2">{strings.stock.indicators}</h3>
            <IndicatorTable stock={stock} />
          </section>
          <section>
            <h3 className="font-bold mb-2">{strings.stock.fundamentals} · {strings.stock.supply}</h3>
            <FundamentalTable fundamental={fundamental} />
            <h3 className="font-bold mt-6 mb-2">{strings.stock.matchedPresets}</h3>
            <MatchedPresets stock={stock} fundamental={fundamental} />
          </section>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Verify**
```bash
npm run type-check
npm run build
```
Expected: pass. Routes should include `ƒ /[basePath]/stock/[code]`.

- [ ] **Commit**
```bash
git add src/app/[basePath]/stock/[code]/StockDetail.tsx
git commit -m "feat(phase-5): integrate StockDetail with full component set"
```

---

## Task 8: Workprogress + Final verification

- [ ] **Run all tests**
```bash
npm test
```
Expected: 69 tests still pass (no new tests added for UI).

- [ ] **Workprogress** `Workprogress/Phase_5_2026-04-14.md`:

```markdown
# Phase 5 — 초보 모드 + 개별 종목 분석 페이지

Phase: 5
Status: 코드 완료 (실데이터 확인 Phase 7)
LastUpdate: 2026-04-14
Branch: feature/phase-5-beginner-stock-detail

RecentWork:
  - lightweight-charts 라이브러리 통합
  - stock 관련 문자열 리소스 추가
  - BeginnerScreener + RecommendCard (초보 모드 카드 뷰, 조합 프리셋 기반)
  - ScreenerSwitcher (mode 기반 조건부 렌더)
  - Stock 상세 페이지 (server shell + client container)
  - StockChart (TradingView: 캔들 + MA)
  - IndicatorTable / FundamentalTable / MatchedPresets / BeginnerGuide
  - 초보 모드는 해설 중심, 전문가 모드는 지표 테이블 중심으로 분기

ResolvedWork:
  - Task 1: 차트 라이브러리 + 문자열
  - Task 2: BeginnerScreener
  - Task 3: ScreenerSwitcher
  - Task 4: Stock 페이지 기본 구조
  - Task 5: 차트 + 지표 테이블
  - Task 6: 펀더멘털/매칭/초보가이드
  - Task 7: StockDetail 통합

MainIssues:
  - OHLC 데이터는 현재 close만 사용 (StockIndicators에 open/high/low 없음). Phase 7에서 ohlcv.json 추가 로드 또는 indicators.json에 OHLC 포함 결정 필요
  - 실데이터 브라우저 E2E 검증 Phase 7로 이관

ResolvedIssues: 없음

RelatedPhases:
  - Phase 4 (프리셋 엔진)
  - Phase 7 (데이터 공급)

NoteForFuture:
  - 차트에서 OHLC 캔들 제대로 보려면 ohlcv.json 별도 로드 추가 필요
  - 볼린저밴드/거래량 차트 패널 추가 (2차)
  
CommitLog: (git log --oneline main..HEAD --reverse)
```

- [ ] **Commit**
```bash
git add Workprogress/Phase_5_2026-04-14.md
git commit -m "docs(phase-5): add Phase 5 workprogress record"
```

## 🏁 Phase 5 완료 조건

- [ ] 8 Task 완료, Vitest 69 PASS 유지
- [ ] build 성공, /stock/[code] 라우트 등록
- [ ] 사용자 확인 후 push + PR
