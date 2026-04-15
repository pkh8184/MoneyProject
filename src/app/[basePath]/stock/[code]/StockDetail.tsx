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
