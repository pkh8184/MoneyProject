'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { strings } from '@/lib/strings/ko'
import type { StocksJson, StockMeta } from '@/lib/types/indicators'
import Card from '@/components/ui/Card'

interface Props { basePath: string }

export default function StockList({ basePath }: Props) {
  const [stocks, setStocks] = useState<StockMeta[]>([])
  const [updatedAt, setUpdatedAt] = useState<string>('')
  const [tradeDate, setTradeDate] = useState<string>('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/data/stocks.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: StocksJson | null) => {
        if (!data) { setLoading(false); return }
        setStocks(data.stocks || [])
        setUpdatedAt(data.updated_at || '')
        setTradeDate(data.trade_date || '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return stocks
    return stocks.filter((s) =>
      s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    )
  }, [stocks, query])

  if (loading) return <p>{strings.common.loading}</p>
  if (stocks.length === 0) return <p>{strings.stockList.empty}</p>

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-2xl font-bold">{strings.stockList.title}</h2>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
          거래일: {tradeDate} · 수집 시각: {updatedAt}
        </p>
      </header>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={strings.stockList.searchPlaceholder}
        className="w-full h-14 px-5 mb-4 rounded-2xl bg-bg-secondary-light dark:bg-bg-secondary-dark text-base placeholder-text-secondary-light dark:placeholder-text-secondary-dark focus:outline-none focus:ring-2 focus:ring-accent-light dark:focus:ring-accent-dark"
      />

      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-3">
        {query ? strings.stockList.filteredCount(filtered.length, stocks.length) : strings.stockList.totalCount(stocks.length)}
      </p>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Card padding="sm" className="!p-0 overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="text-left text-sm text-text-secondary-light dark:text-text-secondary-dark">
                <th className="py-4 px-5">코드</th>
                <th className="py-4 px-5">종목명</th>
                <th className="py-4 px-5">시장</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 500).map((s) => (
                <tr
                  key={s.code}
                  className="border-t border-border-light/50 dark:border-border-dark/50 hover:bg-bg-primary-light dark:hover:bg-bg-primary-dark"
                >
                  <td className="py-3 px-5 font-mono text-sm">
                    <Link href={`/${basePath}/stock/${s.code}`} className="text-accent-light dark:text-accent-dark hover:underline">
                      {s.code}
                    </Link>
                  </td>
                  <td className="py-3 px-5 font-medium">{s.name}</td>
                  <td className="py-3 px-5 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                    {s.market}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {filtered.slice(0, 500).map((s) => (
          <Link key={s.code} href={`/${basePath}/stock/${s.code}`}>
            <Card interactive padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-base">{s.name}</div>
                  <div className="font-mono text-sm text-text-secondary-light dark:text-text-secondary-dark">
                    {s.code}
                  </div>
                </div>
                <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                  {s.market}
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length > 500 && (
        <p className="mt-6 text-sm text-text-secondary-light dark:text-text-secondary-dark">
          상위 500개만 표시. 검색어로 필터링하세요.
        </p>
      )}
    </div>
  )
}
