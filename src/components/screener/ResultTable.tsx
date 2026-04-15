'use client'

import type { FilterResult } from '@/lib/filter'
import { strings } from '@/lib/strings/ko'

interface Props {
  results: FilterResult[]
  loading: boolean
}

export default function ResultTable({ results, loading }: Props) {
  if (loading) return <p className="text-sm">{strings.common.loading}</p>
  if (results.length === 0) return <p className="text-sm">{strings.screener.empty}</p>

  return (
    <div className="overflow-x-auto">
      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-2">
        {strings.screener.resultCount(results.length)}
      </p>
      <table className="w-full text-sm">
        <thead className="border-b border-border-light dark:border-border-dark">
          <tr className="text-left">
            <th className="py-2 pr-4">코드</th>
            <th className="py-2 pr-4">종목명</th>
            <th className="py-2 pr-4">시장</th>
            <th className="py-2 pr-4 text-right">현재가</th>
            <th className="py-2 pr-4 text-right">거래량</th>
            <th className="py-2 text-right">RSI</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.code} className="border-b border-border-light dark:border-border-dark">
              <td className="py-2 pr-4 font-mono text-xs">{r.code}</td>
              <td className="py-2 pr-4">{r.name}</td>
              <td className="py-2 pr-4 text-xs text-text-secondary-light dark:text-text-secondary-dark">{r.market}</td>
              <td className="py-2 pr-4 text-right">{r.price?.toLocaleString() ?? '-'}</td>
              <td className="py-2 pr-4 text-right text-xs">{r.volume?.toLocaleString() ?? '-'}</td>
              <td className="py-2 text-right">{r.rsi?.toFixed(1) ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
