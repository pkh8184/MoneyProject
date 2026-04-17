import type { MacroFactor, MacroBonus, MacroBonusDetail } from './types'
import { matchesFactor } from './matching'

export function computeMacroBonus(
  stockName: string,
  themes: string[] | undefined,
  activeFactors: MacroFactor[]
): MacroBonus {
  const detail: MacroBonusDetail[] = []
  for (const f of activeFactors) {
    let delta = 0
    if (matchesFactor(stockName, themes, f.beneficiaries)) delta += f.weight
    if (matchesFactor(stockName, themes, f.losers)) delta -= f.weight
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
