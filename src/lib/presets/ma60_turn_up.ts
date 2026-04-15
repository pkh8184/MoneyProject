import { strings } from '@/lib/strings/ko'
import { prev, latest, allValid } from './utils'
import type { Preset } from './types'

export const ma60TurnUp: Preset = {
  id: 'ma60_turn_up',
  name: strings.presets.ma60_turn_up.name,
  mode: ['expert'],
  category: 'trend_ma',
  shortFormula: 'MA60 기울기 음→양 전환',
  params: [],
  description: {
    beginner: strings.presets.ma60_turn_up.beginnerDesc,
    expert: strings.presets.ma60_turn_up.expertDesc
  },
  buyTiming: strings.presets.ma60_turn_up.buyTiming,
  holdingPeriod: strings.presets.ma60_turn_up.holdingPeriod,
  stopLoss: strings.presets.ma60_turn_up.stopLoss,
  traps: strings.presets.ma60_turn_up.traps,

  filter: ({ stock }) => {
    const today = latest(stock.ma60)
    const t5 = prev(stock.ma60, 5)
    const t10 = prev(stock.ma60, 10)
    if (!allValid(today, t5, t10)) return false
    return today! > t5! && t5! <= t10!
  }
}
