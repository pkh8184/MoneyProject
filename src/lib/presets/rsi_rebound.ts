import { strings } from '@/lib/strings/ko'
import { latest, prev, allValid } from './utils'
import type { Preset } from './types'

export const rsiRebound: Preset = {
  id: 'rsi_rebound',
  name: strings.presets.rsi_rebound.name,
  mode: ['expert'],
  params: [],
  description: {
    beginner: strings.presets.rsi_rebound.beginnerDesc,
    expert: strings.presets.rsi_rebound.expertDesc
  },
  buyTiming: strings.presets.rsi_rebound.buyTiming,
  holdingPeriod: strings.presets.rsi_rebound.holdingPeriod,
  stopLoss: strings.presets.rsi_rebound.stopLoss,
  traps: strings.presets.rsi_rebound.traps,

  filter: ({ stock }) => {
    const today = latest(stock.rsi14)
    if (today == null || today <= 30) return false
    const recent5 = stock.rsi14.slice(-6, -1).filter((v): v is number => v != null)
    if (recent5.length === 0 || !recent5.some((v) => v <= 30)) return false
    const m60 = latest(stock.ma60), m60_20 = prev(stock.ma60, 20)
    if (!allValid(m60, m60_20)) return false
    return m60! > m60_20!
  },
  sortScore: ({ stock }) => (latest(stock.rsi14) ?? 30) - 30
}
