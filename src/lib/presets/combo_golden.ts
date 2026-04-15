import { strings } from '@/lib/strings/ko'
import { latest } from './utils'
import { goldenCross } from './golden_cross'
import { volumeSpike } from './volume_spike'
import type { Preset } from './types'

export const comboGolden: Preset = {
  id: 'combo_golden',
  name: strings.presets.combo_golden.name,
  mode: ['beginner', 'expert'],
  params: [],
  description: {
    beginner: strings.presets.combo_golden.beginnerDesc,
    expert: strings.presets.combo_golden.expertDesc
  },
  buyTiming: strings.presets.combo_golden.buyTiming,
  holdingPeriod: strings.presets.combo_golden.holdingPeriod,
  stopLoss: strings.presets.combo_golden.stopLoss,
  traps: strings.presets.combo_golden.traps,

  filter: (ctx) => {
    if (!goldenCross.filter(ctx)) return false
    if (!volumeSpike.filter({ ...ctx, params: { K: 1.5 } })) return false
    const rsi = latest(ctx.stock.rsi14)
    if (rsi == null) return false
    return rsi > 50
  }
}
