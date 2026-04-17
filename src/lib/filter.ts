import type { Preset, PresetParams } from './presets/types'
import type { IndicatorsJson, FundamentalsJson, SectorsJson, StockIndicators } from '@/lib/types/indicators'
import type { MacroFactor, MacroBonus } from './macro/types'
import { computeMacroBonus } from './macro/scoring'

export interface FilterResult {
  code: string
  name: string
  market: string
  price: number | null
  volume: number | null
  rsi: number | null
  score: number
  macroBonus?: MacroBonus
  finalScore?: number
}

const MAX_RESULTS = 100

export function runPreset(
  preset: Preset,
  indicators: IndicatorsJson | null | undefined,
  fundamentals: FundamentalsJson | null | undefined,
  params: PresetParams
): FilterResult[] {
  if (!indicators || typeof indicators !== 'object') return []
  const fundMap = fundamentals && typeof fundamentals === 'object' ? fundamentals : {}
  const results: FilterResult[] = []

  for (const [code, value] of Object.entries(indicators)) {
    if (code === 'meta') continue
    const stock = value as StockIndicators
    if (!stock || typeof stock !== 'object' || !Array.isArray(stock.close)) continue
    const fundamental = fundMap[code]
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

export function enrichWithMacro(
  results: FilterResult[],
  sectors: SectorsJson | null | undefined,
  activeFactors: MacroFactor[]
): FilterResult[] {
  if (activeFactors.length === 0) return results
  const enriched = results.map((r) => {
    const themes = sectors?.[r.code]?.themes
    const bonus = computeMacroBonus(r.name, themes, activeFactors)
    return {
      ...r,
      macroBonus: bonus,
      finalScore: r.score + bonus.total
    }
  })
  enriched.sort((a, b) => (b.finalScore ?? b.score) - (a.finalScore ?? a.score))
  return enriched
}
