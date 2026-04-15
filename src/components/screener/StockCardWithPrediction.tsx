'use client'

import Link from 'next/link'
import type { FilterResult } from '@/lib/filter'
import type { PresetPatternStats } from '@/lib/types/indicators'

interface Props {
  result: FilterResult
  tagLabel: string
  stats?: PresetPatternStats
  basePath: string
}

export default function StockCardWithPrediction({ result, tagLabel, stats, basePath }: Props) {
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
      <div className="text-lg font-bold mb-2">
        {result.price?.toLocaleString() ?? '-'}원
      </div>
      {stats && stats.sample_count >= 5 && (
        <div className="border-t border-border-light dark:border-border-dark pt-2 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-text-secondary-light dark:text-text-secondary-dark">D+1</span>
            <span>{stats.d1.avg > 0 ? '+' : ''}{stats.d1.avg}% ({stats.d1.win_rate}% ↑)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary-light dark:text-text-secondary-dark">D+3</span>
            <span>{stats.d3.avg > 0 ? '+' : ''}{stats.d3.avg}% ({stats.d3.win_rate}% ↑)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary-light dark:text-text-secondary-dark">D+7</span>
            <span>{stats.d7.avg > 0 ? '+' : ''}{stats.d7.avg}% ({stats.d7.win_rate}% ↑)</span>
          </div>
          <div className="text-text-secondary-light dark:text-text-secondary-dark text-[10px]">
            과거 통계 {stats.sample_count}건 · 참고용
          </div>
        </div>
      )}
    </Link>
  )
}
