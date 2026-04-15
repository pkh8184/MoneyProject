'use client'

import { useMemo, useState } from 'react'
import StockCardWithPrediction from '@/components/screener/StockCardWithPrediction'
import { THEME_DEFS } from '@/lib/themes/keywords'
import { filterStocksByTheme } from '@/lib/themes/matcher'
import { comboGolden } from '@/lib/presets/combo_golden'
import { volumeSpike } from '@/lib/presets/volume_spike'
import type {
  IndicatorsJson, FundamentalsJson, PatternStatsJson,
  SectorsJson, StockIndicators
} from '@/lib/types/indicators'

interface Props {
  indicators: IndicatorsJson | null
  fundamentals: FundamentalsJson
  sectors: SectorsJson | null
  patternStats: PatternStatsJson | null
  basePath: string
}

export default function ThemeSection({ indicators, fundamentals, sectors, patternStats, basePath }: Props) {
  const [activeTheme, setActiveTheme] = useState<string>(THEME_DEFS[0].id)

  const results = useMemo(() => {
    if (!indicators || !sectors) return []
    const codesInTheme = new Set(filterStocksByTheme(sectors, activeTheme))
    const items: Array<{ code: string; name: string; market: string; price: number | null; volume: number | null; rsi: number | null; score: number; tagLabel: string }> = []
    for (const code of codesInTheme) {
      const stock = (indicators as any)[code] as StockIndicators | undefined
      if (!stock) continue
      const ctx = { stock, fundamental: fundamentals[code], params: {} }
      if (comboGolden.filter(ctx) || volumeSpike.filter({ ...ctx, params: { K: 1.5 } })) {
        items.push({
          code,
          name: stock.name,
          market: stock.market,
          price: stock.close.at(-1) ?? null,
          volume: stock.volume.at(-1) ?? null,
          rsi: stock.rsi14.at(-1) ?? null,
          score: 0,
          tagLabel: '테마 내 유망 신호'
        })
      }
    }
    return items.slice(0, 6)
  }, [indicators, fundamentals, sectors, activeTheme])

  return (
    <section>
      <h2 className="text-lg font-bold mb-4">🏷 테마별</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {THEME_DEFS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTheme(t.id)}
            className={`text-xs px-3 py-1 rounded-full border ${
              activeTheme === t.id
                ? 'bg-accent-light dark:bg-accent-dark text-white border-transparent'
                : 'border-border-light dark:border-border-dark'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {results.length === 0 ? (
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">이 테마에서 신호 발견 없음</p>
      ) : (
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
      )}
    </section>
  )
}
