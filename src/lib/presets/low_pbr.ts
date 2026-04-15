import { strings } from '@/lib/strings/ko'
import type { Preset } from './types'

export const lowPbr: Preset = {
  id: 'low_pbr',
  name: strings.presets.low_pbr.name,
  mode: ['expert'],
  category: 'value',
  shortFormula: 'PBR < K',
  params: [
    { key: 'K', label: 'PBR 기준', type: 'slider', min: 0.5, max: 1.5, step: 0.05, default: 1.0 }
  ],
  description: {
    beginner: strings.presets.low_pbr.beginnerDesc,
    expert: strings.presets.low_pbr.expertDesc
  },
  buyTiming: strings.presets.low_pbr.buyTiming,
  holdingPeriod: strings.presets.low_pbr.holdingPeriod,
  stopLoss: strings.presets.low_pbr.stopLoss,
  traps: strings.presets.low_pbr.traps,

  filter: ({ fundamental, params }) => {
    if (!fundamental || fundamental.pbr == null || fundamental.pbr <= 0) return false
    const K = Number(params.K ?? 1.0)
    return fundamental.pbr < K
  },
  sortScore: ({ fundamental }) => -(fundamental?.pbr ?? 999)
}
