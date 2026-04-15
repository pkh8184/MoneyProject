'use client'

import { useMemo } from 'react'
import StockCardWithPrediction from '@/components/screener/StockCardWithPrediction'
import { getBeginnerPresets } from '@/lib/presets/registry'
import { runPreset, type FilterResult } from '@/lib/filter'
import type { IndicatorsJson, FundamentalsJson, PatternStatsJson } from '@/lib/types/indicators'

interface Props {
  indicators: IndicatorsJson | null
  fundamentals: FundamentalsJson
  patternStats: PatternStatsJson | null
  basePath: string
}

export default function TodayRecommendSection({ indicators, fundamentals, patternStats, basePath }: Props) {
  const results = useMemo(() => {
    if (!indicators) return []
    const presets = getBeginnerPresets()
    const collected: Array<FilterResult & { tagLabel: string }> = []
    for (const preset of presets) {
      const out = runPreset(preset, indicators, fundamentals, {})
      for (const r of out) {
        collected.push({ ...r, tagLabel: preset.description.beginner })
      }
    }
    const seen = new Set<string>()
    return collected.filter((r) => {
      if (seen.has(r.code)) return false
      seen.add(r.code)
      return true
    }).slice(0, 6)
  }, [indicators, fundamentals])

  if (results.length === 0) return null
  return (
    <section>
      <h2 className="text-lg font-bold mb-4">📌 오늘의 추천 종목</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((r) => (
          <StockCardWithPrediction
            key={r.code}
            result={r}
            tagLabel={r.tagLabel}
            stats={patternStats?.by_stock_preset?.[r.code]?.volume_spike}
            basePath={basePath}
          />
        ))}
      </div>
    </section>
  )
}
