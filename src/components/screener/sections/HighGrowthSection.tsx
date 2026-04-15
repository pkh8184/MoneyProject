'use client'

import { useMemo } from 'react'
import StockCardWithPrediction from '@/components/screener/StockCardWithPrediction'
import { volumeSpike } from '@/lib/presets/volume_spike'
import { runPreset } from '@/lib/filter'
import { latest, prev } from '@/lib/presets/utils'
import type { IndicatorsJson, FundamentalsJson, PatternStatsJson, StockIndicators } from '@/lib/types/indicators'

interface Props {
  indicators: IndicatorsJson | null
  fundamentals: FundamentalsJson
  patternStats: PatternStatsJson | null
  basePath: string
}

export default function HighGrowthSection({ indicators, fundamentals, patternStats, basePath }: Props) {
  const results = useMemo(() => {
    if (!indicators) return []
    const vs = runPreset(volumeSpike, indicators, fundamentals, { K: 2.0 })
    // Extra filter: MA20 위 + 상승 추세
    return vs.filter((r) => {
      const stock = (indicators as any)[r.code] as StockIndicators | undefined
      if (!stock) return false
      const close = latest(stock.close)
      const ma20 = latest(stock.ma20)
      const prevClose = prev(stock.close, 1)
      if (close == null || ma20 == null || prevClose == null) return false
      return close > ma20 && close > prevClose
    }).slice(0, 6)
  }, [indicators, fundamentals])

  if (results.length === 0) return null
  return (
    <section>
      <header className="mb-6">
        <h2 className="text-2xl font-bold">🚀 급등 예상</h2>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
          단기 급등 가능성이 높은 종목
        </p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {results.map((r) => (
          <StockCardWithPrediction
            key={r.code}
            result={r}
            tagLabel="거래량 급증 + 상승 추세"
            stats={patternStats?.by_stock_preset?.[r.code]?.volume_spike}
            basePath={basePath}
          />
        ))}
      </div>
    </section>
  )
}
