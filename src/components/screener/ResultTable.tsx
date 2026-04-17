'use client'

import Link from 'next/link'
import type { FilterResult } from '@/lib/filter'
import { strings } from '@/lib/strings/ko'
import Card from '@/components/ui/Card'
import MacroBadge from '@/components/macro/MacroBadge'

interface Props {
  results: FilterResult[]
  loading: boolean
  basePath?: string
}

export default function ResultTable({ results, loading, basePath = '' }: Props) {
  if (loading) return <p className="text-base">{strings.common.loading}</p>
  if (results.length === 0) return <p className="text-base">{strings.screener.empty}</p>

  return (
    <div>
      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-3">
        {strings.screener.resultCount(results.length)}
      </p>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="text-left text-sm text-text-secondary-light dark:text-text-secondary-dark">
              <th className="py-3 pr-4">코드</th>
              <th className="py-3 pr-4">종목명</th>
              <th className="py-3 pr-4">시장</th>
              <th className="py-3 pr-4 text-right">현재가</th>
              <th className="py-3 pr-4 text-right">거래량</th>
              <th className="py-3 text-right">RSI</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr
                key={r.code}
                className="border-t border-border-light/50 dark:border-border-dark/50 hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark"
              >
                <td className="py-3 pr-4 font-mono text-sm">
                  {basePath ? (
                    <Link href={`/${basePath}/stock/${r.code}`} className="hover:underline">{r.code}</Link>
                  ) : r.code}
                </td>
                <td className="py-3 pr-4 font-medium">
                  <span className="inline-flex items-center gap-2">
                    {r.name}
                    {r.macroBonus && <MacroBadge bonus={r.macroBonus} />}
                  </span>
                </td>
                <td className="py-3 pr-4 text-sm text-text-secondary-light dark:text-text-secondary-dark">{r.market}</td>
                <td className="py-3 pr-4 text-right">{r.price?.toLocaleString() ?? '-'}</td>
                <td className="py-3 pr-4 text-right text-sm">{r.volume?.toLocaleString() ?? '-'}</td>
                <td className="py-3 text-right">{r.rsi?.toFixed(1) ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {results.map((r) => {
          const inner = (
            <Card interactive={!!basePath} padding="md">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-base">{r.name}</span>
                    {r.macroBonus && <MacroBadge bonus={r.macroBonus} />}
                  </div>
                  <div className="font-mono text-sm text-text-secondary-light dark:text-text-secondary-dark">
                    {r.code} · {r.market}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-base">{r.price?.toLocaleString() ?? '-'}원</div>
                  <div className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                    RSI {r.rsi?.toFixed(1) ?? '-'}
                  </div>
                </div>
              </div>
            </Card>
          )
          return basePath ? (
            <Link key={r.code} href={`/${basePath}/stock/${r.code}`}>{inner}</Link>
          ) : (
            <div key={r.code}>{inner}</div>
          )
        })}
      </div>
    </div>
  )
}
