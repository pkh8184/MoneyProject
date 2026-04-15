'use client'

import { useMemo } from 'react'
import StockCardWithPrediction from '@/components/screener/StockCardWithPrediction'
import type { IndicatorsJson, PatternStatsJson, StockIndicators } from '@/lib/types/indicators'

interface Props {
  indicators: IndicatorsJson | null
  patternStats: PatternStatsJson | null
  basePath: string
}

export default function PredictedReturnSection({ indicators, patternStats, basePath }: Props) {
  const top = useMemo(() => {
    if (!indicators || !patternStats) return []
    const byStockPreset = patternStats.by_stock_preset
    if (!byStockPreset || typeof byStockPreset !== 'object') return []
    const items: Array<{
      code: string; name: string; market: string; price: number | null;
      volume: number | null; rsi: number | null; score: number; tagLabel: string;
      stats: PatternStatsJson['by_stock_preset'][string][string]
    }> = []
    for (const [code, perPreset] of Object.entries(byStockPreset)) {
      if (!perPreset || typeof perPreset !== 'object') continue
      const stock = (indicators as any)[code] as StockIndicators | undefined
      if (!stock) continue
      let bestStats: PatternStatsJson['by_stock_preset'][string][string] | null = null
      let bestD7 = -Infinity
      for (const stats of Object.values(perPreset)) {
        if (stats.sample_count >= 5 && stats.d7.avg > bestD7) {
          bestD7 = stats.d7.avg
          bestStats = stats
        }
      }
      if (bestStats && bestD7 > 0) {
        items.push({
          code,
          name: stock.name,
          market: stock.market,
          price: stock.close.at(-1) ?? null,
          volume: stock.volume.at(-1) ?? null,
          rsi: stock.rsi14.at(-1) ?? null,
          score: bestD7,
          tagLabel: `D+7 예상 +${bestD7.toFixed(1)}%`,
          stats: bestStats
        })
      }
    }
    items.sort((a, b) => b.score - a.score)
    return items.slice(0, 10)
  }, [indicators, patternStats])

  if (top.length === 0) return null
  return (
    <section>
      <header className="mb-6">
        <h2 className="text-2xl font-bold">📈 예측 수익률 Top 10</h2>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
          과거 유사 패턴 기반 예상 수익 상위 10개
        </p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {top.map((r) => (
          <StockCardWithPrediction
            key={r.code}
            result={r}
            tagLabel={r.tagLabel}
            stats={r.stats}
            basePath={basePath}
          />
        ))}
      </div>
    </section>
  )
}
