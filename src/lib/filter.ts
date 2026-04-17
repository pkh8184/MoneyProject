import type { Preset, PresetParams } from './presets/types'
import type { IndicatorsJson, FundamentalsJson, SectorsJson, StockIndicators, SectorRotationJson, MLPredictionsJson, MLPrediction } from '@/lib/types/indicators'
import type { MacroFactor, MacroBonus } from './macro/types'
import { computeMacroBonus } from './macro/scoring'
import { computeSectorRotationBonus, type SectorRotationBonus } from './macro/sectorRotation'

export interface FilterResult {
  code: string
  name: string
  market: string
  price: number | null
  volume: number | null
  rsi: number | null
  score: number
  macroBonus?: MacroBonus
  sectorRotationBonus?: SectorRotationBonus
  mlPrediction?: MLPrediction
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
  activeFactors: MacroFactor[],
  rotation?: SectorRotationJson | null
): FilterResult[] {
  const hasFactors = activeFactors.length > 0
  const hasRotation = !!rotation
  if (!hasFactors && !hasRotation) return results
  const enriched = results.map((r) => {
    const themes = sectors?.[r.code]?.themes
    const bonus = hasFactors
      ? computeMacroBonus(r.name, themes, activeFactors)
      : undefined
    const rotationBonus = hasRotation
      ? computeSectorRotationBonus(themes, rotation!)
      : undefined
    const total = (bonus?.total ?? 0) + (rotationBonus?.sectorRotationDelta ?? 0)
    return {
      ...r,
      macroBonus: bonus,
      sectorRotationBonus: rotationBonus,
      finalScore: r.score + total
    }
  })
  enriched.sort((a, b) => (b.finalScore ?? b.score) - (a.finalScore ?? a.score))
  return enriched
}

export function enrichWithMl(
  results: FilterResult[],
  predictions: MLPredictionsJson | null
): FilterResult[] {
  if (!predictions) return results
  const map = predictions.predictions
  const enriched = results.map((r) => {
    const pred = map[r.code]
    if (!pred) return r
    return {
      ...r,
      mlPrediction: pred,
      finalScore: (r.finalScore ?? r.score) + pred.ml_score
    }
  })
  enriched.sort((a, b) => (b.finalScore ?? b.score) - (a.finalScore ?? a.score))
  return enriched
}
