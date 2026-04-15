import { strings } from '@/lib/strings/ko'
import type { Preset } from './types'

export const foreignInstBuy: Preset = {
  id: 'foreign_inst_buy',
  name: strings.presets.foreign_inst_buy.name,
  mode: ['expert'],
  category: 'volume_flow',
  shortFormula: '외국인·기관 N일 연속 순매수',
  params: [
    { key: 'N', label: '연속일 수', type: 'slider', min: 2, max: 10, step: 1, default: 3 }
  ],
  description: {
    beginner: strings.presets.foreign_inst_buy.beginnerDesc,
    expert: strings.presets.foreign_inst_buy.expertDesc
  },
  buyTiming: strings.presets.foreign_inst_buy.buyTiming,
  holdingPeriod: strings.presets.foreign_inst_buy.holdingPeriod,
  stopLoss: strings.presets.foreign_inst_buy.stopLoss,
  traps: strings.presets.foreign_inst_buy.traps,

  filter: ({ fundamental, params }) => {
    if (!fundamental) return false
    const N = Number(params.N ?? 3)
    const f = fundamental.foreign_net.slice(-N)
    const i = fundamental.institution_net.slice(-N)
    if (f.length < N || i.length < N) return false
    return f.every((x) => x > 0) && i.every((x) => x > 0)
  }
}
