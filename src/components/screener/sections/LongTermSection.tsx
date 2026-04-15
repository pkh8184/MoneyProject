'use client'

import { useMemo } from 'react'
import StockCardWithPrediction from '@/components/screener/StockCardWithPrediction'
import { alignment } from '@/lib/presets/alignment'
import { ma60TurnUp } from '@/lib/presets/ma60_turn_up'
import { lowPbr } from '@/lib/presets/low_pbr'
import { runPreset } from '@/lib/filter'
import type { IndicatorsJson, FundamentalsJson, PatternStatsJson } from '@/lib/types/indicators'

interface Props {
  indicators: IndicatorsJson | null
  fundamentals: FundamentalsJson
  patternStats: PatternStatsJson | null
  basePath: string
}

export default function LongTermSection({ indicators, fundamentals, patternStats, basePath }: Props) {
  const results = useMemo(() => {
    if (!indicators) return []
    const all = [
      ...runPreset(alignment, indicators, fundamentals, {}),
      ...runPreset(ma60TurnUp, indicators, fundamentals, {}),
      ...runPreset(lowPbr, indicators, fundamentals, { K: 0.8 })
    ]
    const seen = new Set<string>()
    return all.filter((r) => {
      if (seen.has(r.code)) return false
      seen.add(r.code)
      return true
    }).slice(0, 6)
  }, [indicators, fundamentals])

  if (results.length === 0) return null
  return (
    <section>
      <h2 className="text-lg font-bold mb-4">🏔 중장기 장기 투자</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((r) => (
          <StockCardWithPrediction
            key={r.code}
            result={r}
            tagLabel="장기 상승 추세"
            stats={patternStats?.by_stock_preset?.[r.code]?.golden_cross}
            basePath={basePath}
          />
        ))}
      </div>
    </section>
  )
}
