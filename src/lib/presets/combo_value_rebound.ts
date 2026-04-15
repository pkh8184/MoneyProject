import { strings } from '@/lib/strings/ko'
import { latest, allValid } from './utils'
import { lowPbr } from './low_pbr'
import { rsiRebound } from './rsi_rebound'
import type { Preset } from './types'

export const comboValueRebound: Preset = {
  id: 'combo_value_rebound',
  name: strings.presets.combo_value_rebound.name,
  mode: ['beginner', 'expert'],
  params: [],
  description: {
    beginner: strings.presets.combo_value_rebound.beginnerDesc,
    expert: strings.presets.combo_value_rebound.expertDesc
  },
  buyTiming: strings.presets.combo_value_rebound.buyTiming,
  holdingPeriod: strings.presets.combo_value_rebound.holdingPeriod,
  stopLoss: strings.presets.combo_value_rebound.stopLoss,
  traps: strings.presets.combo_value_rebound.traps,

  filter: (ctx) => {
    if (!lowPbr.filter({ ...ctx, params: { K: 1.0 } })) return false
    if (!rsiRebound.filter(ctx)) return false
    const c = latest(ctx.stock.close), m60 = latest(ctx.stock.ma60)
    if (!allValid(c, m60)) return false
    return c! >= m60! && c! <= m60! * 1.05
  }
}
