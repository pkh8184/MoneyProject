import { THEME_DEFS } from './keywords'
import type { SectorInfo, SectorsJson } from '@/lib/types/indicators'

export function matchTheme(themeId: string, info: SectorInfo): boolean {
  const def = THEME_DEFS.find((t) => t.id === themeId)
  if (!def) return false
  const haystack = `${info.sector} ${info.industry} ${(info.themes || []).join(' ')}`.toLowerCase()
  return def.keywords.some((kw) => haystack.includes(kw.toLowerCase()))
}

export function filterStocksByTheme(sectors: SectorsJson, themeId: string): string[] {
  return Object.entries(sectors)
    .filter(([_, info]) => matchTheme(themeId, info))
    .map(([code]) => code)
}
