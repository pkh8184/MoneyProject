import type { Preset } from './types'
import type { PresetCategory } from '@/lib/types/presets'

export const CATEGORY_META: Record<PresetCategory, { label: string; icon: string; order: number }> = {
  trend_ma:    { label: '추세·이동평균',   icon: '📈', order: 1 },
  pattern:     { label: '돌파·패턴',       icon: '🔺', order: 2 },
  volume_flow: { label: '거래량·수급',     icon: '📊', order: 3 },
  indicator:   { label: '기술 지표',       icon: '🎯', order: 4 },
  value:       { label: '가치·펀더멘털',   icon: '💰', order: 5 },
  combo:       { label: '조합 전략',       icon: '⭐', order: 6 }
}

export function groupByCategory(presets: Preset[]): Array<{ category: PresetCategory; items: Preset[] }> {
  const map = new Map<PresetCategory, Preset[]>()
  for (const p of presets) {
    const list = map.get(p.category) ?? []
    list.push(p)
    map.set(p.category, list)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => CATEGORY_META[a].order - CATEGORY_META[b].order)
    .map(([category, items]) => ({ category, items }))
}
