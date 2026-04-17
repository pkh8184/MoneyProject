import type { MacroFactor, MacroBonus, MacroBonusDetail } from './types'
import { matchesFactor } from './matching'
import { computeDecayFactor } from './decay'

export function computeMacroBonus(
  stockName: string,
  themes: string[] | undefined,
  activeFactors: MacroFactor[],
  activatedAt?: Record<string, number>
): MacroBonus {
  const detail: MacroBonusDetail[] = []
  for (const f of activeFactors) {
    const decay = activatedAt ? computeDecayFactor(activatedAt[f.id]) : 1
    const weight = Math.round(f.weight * decay)
    let delta = 0
    if (matchesFactor(stockName, themes, f.beneficiaries)) delta += weight
    if (matchesFactor(stockName, themes, f.losers)) delta -= weight
    if (delta !== 0) {
      detail.push({
        factorId: f.id,
        factorName: f.name,
        delta,
        role: delta > 0 ? 'benefit' : 'loss'
      })
    }
  }
  return { total: detail.reduce((s, d) => s + d.delta, 0), detail }
}
