import type { StockIndicators, Fundamental } from '@/lib/types/indicators'
import type { PresetMeta } from '@/lib/types/presets'

export type PresetParams = Record<string, number | boolean>

export interface FilterContext {
  stock: StockIndicators
  fundamental: Fundamental | undefined
  params: PresetParams
}

export interface Preset extends PresetMeta {
  filter: (ctx: FilterContext) => boolean
  sortScore?: (ctx: FilterContext) => number
}
