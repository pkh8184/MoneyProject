import type { MacroFactor, MacroBonus, MacroBonusDetail } from './types'
import { matchesFactor } from './matching'

const BENEFIT_WEIGHT = 5
const LOSS_WEIGHT = 5

export function computeMacroBonus(
  stockName: string,
  themes: string[] | undefined,
  activeFactors: MacroFactor[]
): MacroBonus {
  const detail: MacroBonusDetail[] = []
  for (const f of activeFactors) {
    let delta = 0
    if (matchesFactor(stockName, themes, f.beneficiaries)) {
      delta += BENEFIT_WEIGHT
    }
    if (matchesFactor(stockName, themes, f.losers)) {
      delta -= LOSS_WEIGHT
    }
    if (delta !== 0) {
      detail.push({
        factorId: f.id,
        factorName: f.name,
        delta,
        role: delta > 0 ? 'benefit' : 'loss'
      })
    }
  }
  return {
    total: detail.reduce((s, d) => s + d.delta, 0),
    detail
  }
}
