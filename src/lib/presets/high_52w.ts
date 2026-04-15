import { strings } from '@/lib/strings/ko'
import { latest } from './utils'
import type { Preset } from './types'

export const high52w: Preset = {
  id: 'high_52w',
  name: strings.presets.high_52w.name,
  mode: ['expert'],
  params: [
    { key: 'ratio', label: '신고가 근접도', type: 'slider', min: 0.8, max: 1.0, step: 0.01, default: 1.0 }
  ],
  description: {
    beginner: strings.presets.high_52w.beginnerDesc,
    expert: strings.presets.high_52w.expertDesc
  },
  buyTiming: strings.presets.high_52w.buyTiming,
  holdingPeriod: strings.presets.high_52w.holdingPeriod,
  stopLoss: strings.presets.high_52w.stopLoss,
  traps: strings.presets.high_52w.traps,

  filter: ({ stock, params }) => {
    const c = latest(stock.close)
    if (c == null || stock.high52w == null || !stock.has_52w) return false
    const r = Number(params.ratio ?? 1.0)
    return c >= stock.high52w * r
  },
  sortScore: ({ stock }) => {
    const c = latest(stock.close) ?? 0
    return c / (stock.high52w ?? 1)
  }
}
