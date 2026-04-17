import type { FactorMatch } from './types'

export function matchesFactor(
  stockName: string,
  themes: string[] | undefined,
  m: FactorMatch
): boolean {
  if (m.themes && themes && themes.length > 0) {
    for (const t of m.themes) {
      if (themes.includes(t)) return true
    }
  }
  if (m.nameKeywords) {
    for (const kw of m.nameKeywords) {
      if (stockName.includes(kw)) return true
    }
  }
  return false
}
