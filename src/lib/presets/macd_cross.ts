import { strings } from '@/lib/strings/ko'
import { latest, prev, allValid } from './utils'
import type { Preset } from './types'

export const macdCross: Preset = {
  id: 'macd_cross',
  name: strings.presets.macd_cross.name,
  mode: ['expert'],
  category: 'indicator',
  shortFormula: 'MACD 라인 > Signal 신규 돌파',
  params: [
    { key: 'above_zero', label: '0선 이상만', type: 'toggle', default: false }
  ],
  description: {
    beginner: strings.presets.macd_cross.beginnerDesc,
    expert: strings.presets.macd_cross.expertDesc
  },
  buyTiming: strings.presets.macd_cross.buyTiming,
  holdingPeriod: strings.presets.macd_cross.holdingPeriod,
  stopLoss: strings.presets.macd_cross.stopLoss,
  traps: strings.presets.macd_cross.traps,

  filter: ({ stock, params }) => {
    const lt = latest(stock.macd_line), st = latest(stock.macd_signal)
    const ly = prev(stock.macd_line, 1), sy = prev(stock.macd_signal, 1)
    if (!allValid(lt, st, ly, sy)) return false
    if (!(lt! > st! && ly! <= sy!)) return false
    if (params.above_zero && lt! <= 0) return false
    return true
  }
}
