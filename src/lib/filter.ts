import type { Preset, PresetParams } from './presets/types'
import type { IndicatorsJson, FundamentalsJson, StockIndicators } from '@/lib/types/indicators'

export interface FilterResult {
  code: string
  name: string
  market: string
  price: number | null
  volume: number | null
  rsi: number | null
  score: number
}

const MAX_RESULTS = 100

export function runPreset(
  preset: Preset,
  indicators: IndicatorsJson,
  fundamentals: FundamentalsJson,
  params: PresetParams
): FilterResult[] {
  const results: FilterResult[] = []

  for (const [code, value] of Object.entries(indicators)) {
    if (code === 'meta') continue
    const stock = value as StockIndicators
    const fundamental = fundamentals[code]
    try {
      if (!preset.filter({ stock, fundamental, params })) continue
      const score = preset.sortScore
        ? preset.sortScore({ stock, fundamental, params })
        : 0
      results.push({
        code,
        name: stock.name,
        market: stock.market,
        price: stock.close.at(-1) ?? null,
        volume: stock.volume.at(-1) ?? null,
        rsi: stock.rsi14.at(-1) ?? null,
        score
      })
    } catch {
      // 개별 종목 에러는 스킵
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, MAX_RESULTS)
}
