import { strings } from '@/lib/strings/ko'
import { prev, latest, allValid } from './utils'
import type { Preset } from './types'

export const goldenCross: Preset = {
  id: 'golden_cross',
  name: strings.presets.golden_cross.name,
  mode: ['expert'],
  category: 'trend_ma',
  shortFormula: 'MA20 > MA60 신규 돌파',
  params: [],
  description: {
    beginner: strings.presets.golden_cross.beginnerDesc,
    expert: strings.presets.golden_cross.expertDesc
  },
  buyTiming: strings.presets.golden_cross.buyTiming,
  holdingPeriod: strings.presets.golden_cross.holdingPeriod,
  stopLoss: strings.presets.golden_cross.stopLoss,
  traps: strings.presets.golden_cross.traps,

  filter: ({ stock }) => {
    const ma20Today = latest(stock.ma20)
    const ma60Today = latest(stock.ma60)
    const ma20Yest = prev(stock.ma20, 1)
    const ma60Yest = prev(stock.ma60, 1)
    if (!allValid(ma20Today, ma60Today, ma20Yest, ma60Yest)) return false
    return (ma20Today! > ma60Today!) && (ma20Yest! <= ma60Yest!)
  },
  sortScore: ({ stock }) => latest(stock.volume) ?? 0
}
