'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { loadIndicators, loadFundamentals, loadUpdatedAt } from '@/lib/dataLoader'
import { strings } from '@/lib/strings/ko'
import type { StockIndicators, Fundamental } from '@/lib/types/indicators'

interface Props { code: string; basePath: string }

export default function StockDetail({ code, basePath }: Props) {
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
          {stock.close.at(-1)?.toLocaleString() ?? '-'}원
        </p>
      </header>
    </div>
  )
}
