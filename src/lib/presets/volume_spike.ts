import { strings } from '@/lib/strings/ko'
import { latest, prev, allValid } from './utils'
import type { Preset } from './types'

export const volumeSpike: Preset = {
  id: 'volume_spike',
  name: strings.presets.volume_spike.name,
  mode: ['expert'],
  params: [
    { key: 'K', label: '거래량 배수', type: 'slider', min: 1.2, max: 3.0, step: 0.1, default: 1.5 }
  ],
  description: {
    beginner: strings.presets.volume_spike.beginnerDesc,
    expert: strings.presets.volume_spike.expertDesc
  },
  buyTiming: strings.presets.volume_spike.buyTiming,
  holdingPeriod: strings.presets.volume_spike.holdingPeriod,
  stopLoss: strings.presets.volume_spike.stopLoss,
  traps: strings.presets.volume_spike.traps,

  filter: ({ stock, params }) => {
    const v = latest(stock.volume), va = stock.vol_avg20
    const c = latest(stock.close), cy = prev(stock.close, 1)
    if (!allValid(v, va, c, cy)) return false
    const K = Number(params.K ?? 1.5)
    return v! >= va! * K && c! > cy!
  },
  sortScore: ({ stock }) => {
    const v = latest(stock.volume) ?? 0
    const va = stock.vol_avg20 ?? 1
    return v / va
  }
}
