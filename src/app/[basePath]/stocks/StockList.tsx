'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { strings } from '@/lib/strings/ko'
import type { StocksJson, StockMeta } from '@/lib/types/indicators'

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
      <h2 className="text-xl font-bold mb-2">{strings.stockList.title}</h2>
      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-4">
        거래일: {tradeDate} · 수집 시각: {updatedAt}
      </p>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={strings.stockList.searchPlaceholder}
        className="w-full max-w-md mb-4 px-3 py-2 border border-border-light dark:border-border-dark rounded-md bg-bg-primary-light dark:bg-bg-secondary-dark"
      />

      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-2">
        {query ? strings.stockList.filteredCount(filtered.length, stocks.length) : strings.stockList.totalCount(stocks.length)}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border-light dark:border-border-dark">
            <tr className="text-left">
              <th className="py-2 pr-4">코드</th>
              <th className="py-2 pr-4">종목명</th>
              <th className="py-2 pr-4">시장</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 500).map((s) => (
              <tr key={s.code} className="border-b border-border-light dark:border-border-dark hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark">
                <td className="py-2 pr-4 font-mono text-xs">
                  <Link
                    href={`/${basePath}/stock/${s.code}`}
                    className="text-accent-light dark:text-accent-dark hover:underline"
                  >
                    {s.code}
                  </Link>
                </td>
                <td className="py-2 pr-4">{s.name}</td>
                <td className="py-2 pr-4 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                  {s.market}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > 500 && (
        <p className="mt-4 text-xs text-text-secondary-light dark:text-text-secondary-dark">
          상위 500개만 표시. 검색어로 필터링하세요.
        </p>
      )}
    </div>
  )
}
