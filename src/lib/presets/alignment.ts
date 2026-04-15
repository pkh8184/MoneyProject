import { strings } from '@/lib/strings/ko'
import { prev, latest, allValid } from './utils'
import type { Preset } from './types'

export const alignment: Preset = {
  id: 'alignment',
  name: strings.presets.alignment.name,
  mode: ['expert'],
  category: 'trend_ma',
  shortFormula: 'MA5 > MA20 > MA60 > MA120 신규 완성',
  params: [],
  description: {
    beginner: strings.presets.alignment.beginnerDesc,
    expert: strings.presets.alignment.expertDesc
  },
  buyTiming: strings.presets.alignment.buyTiming,
  holdingPeriod: strings.presets.alignment.holdingPeriod,
  stopLoss: strings.presets.alignment.stopLoss,
  traps: strings.presets.alignment.traps,

  filter: ({ stock }) => {
    const m5 = latest(stock.ma5), m20 = latest(stock.ma20)
    const m60 = latest(stock.ma60), m120 = latest(stock.ma120)
    const m5y = prev(stock.ma5, 1), m20y = prev(stock.ma20, 1)
    const m60y = prev(stock.ma60, 1), m120y = prev(stock.ma120, 1)
    if (!allValid(m5, m20, m60, m120, m5y, m20y, m60y, m120y)) return false
    const alignedToday = m5! > m20! && m20! > m60! && m60! > m120!
    const alignedYest = m5y! > m20y! && m20y! > m60y! && m60y! > m120y!
    return alignedToday && !alignedYest
  }
}
