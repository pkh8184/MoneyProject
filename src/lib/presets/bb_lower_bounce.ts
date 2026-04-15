import { strings } from '@/lib/strings/ko'
import { latest, prev, allValid } from './utils'
import type { Preset } from './types'

export const bbLowerBounce: Preset = {
  id: 'bb_lower_bounce',
  name: strings.presets.bb_lower_bounce.name,
  mode: ['expert'],
  category: 'pattern',
  shortFormula: '밴드 하단 이탈 → 재진입',
  params: [],
  description: {
    beginner: strings.presets.bb_lower_bounce.beginnerDesc,
    expert: strings.presets.bb_lower_bounce.expertDesc
  },
  buyTiming: strings.presets.bb_lower_bounce.buyTiming,
  holdingPeriod: strings.presets.bb_lower_bounce.holdingPeriod,
  stopLoss: strings.presets.bb_lower_bounce.stopLoss,
  traps: strings.presets.bb_lower_bounce.traps,

  filter: ({ stock }) => {
    const c = latest(stock.close), cy = prev(stock.close, 1)
    const bl = latest(stock.bb_lower), bly = prev(stock.bb_lower, 1)
    if (!allValid(c, cy, bl, bly)) return false
    return c! >= bl! && cy! < bly!
  }
}
