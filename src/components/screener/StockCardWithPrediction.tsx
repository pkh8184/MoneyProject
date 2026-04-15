'use client'

import Link from 'next/link'
import type { FilterResult } from '@/lib/filter'
import type { PresetPatternStats } from '@/lib/types/indicators'
import Card from '@/components/ui/Card'
import GaugeBar from '@/components/ui/GaugeBar'

interface Props {
  result: FilterResult
  tagLabel: string
  stats?: PresetPatternStats
  basePath: string
}

export default function StockCardWithPrediction({ result, tagLabel, stats, basePath }: Props) {
  return (
    <Link href={`/${basePath}/stock/${result.code}`} className="block">
      <Card interactive padding="md">
        <div className="text-sm text-accent-light dark:text-accent-dark font-bold mb-2">
          🟢 {tagLabel}
        </div>
        <div className="font-bold text-lg">{result.name}</div>
        <div className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-3">
          {result.code} · {result.market}
        </div>
        <div className="text-2xl font-bold mb-3">
          {result.price?.toLocaleString() ?? '-'}원
        </div>
        {stats && stats.sample_count >= 5 && (
          <div className="pt-3 border-t border-border-light/50 dark:border-border-dark/50">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>D+7 예상 {stats.d7.avg > 0 ? '+' : ''}{stats.d7.avg}%</span>
              <span className="text-text-secondary-light dark:text-text-secondary-dark">신뢰 {stats.d7.win_rate}%</span>
            </div>
            <GaugeBar value={stats.d7.win_rate} max={100} />
            <div className="mt-1 text-xs text-text-secondary-light dark:text-text-secondary-dark">
              과거 {stats.sample_count}건 · 참고용
            </div>
          </div>
        )}
      </Card>
    </Link>
  )
}
