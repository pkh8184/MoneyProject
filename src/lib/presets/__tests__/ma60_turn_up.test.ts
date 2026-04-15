import { describe, it, expect } from 'vitest'
import { ma60TurnUp } from '../ma60_turn_up'
import type { StockIndicators } from '@/lib/types/indicators'

function mkStock(overrides: Partial<StockIndicators>): StockIndicators {
  const len = (overrides.dates?.length) ?? 2
  const nullArr = Array(len).fill(null)
  return {
    name: 'T', market: 'KOSPI',
    dates: ['2026-04-13', '2026-04-14'],
    close: Array(len).fill(100), volume: Array(len).fill(1000),
    ma5: [...nullArr], ma20: [...nullArr], ma60: [...nullArr], ma120: [...nullArr],
    rsi14: [...nullArr],
    macd_line: [...nullArr], macd_signal: [...nullArr], macd_hist: [...nullArr],
    bb_upper: [...nullArr], bb_middle: [...nullArr], bb_lower: [...nullArr],
    high52w: null, has_52w: false, vol_avg20: null,
    ...overrides
  }
}

const dates11 = Array(11).fill(0).map((_, i) => `2026-03-${String(i + 1).padStart(2, '0')}`)

describe('ma60TurnUp preset', () => {
  it('matches when MA60 turned up (today > 5d ago, 5d ago <= 10d ago)', () => {
    const stock = mkStock({
      dates: dates11,
      ma60: [110, null, null, null, null, 100, null, null, null, null, 120]
    })
    expect(ma60TurnUp.filter({ stock, fundamental: undefined, params: {} })).toBe(true)
  })
  it('does not match when still declining', () => {
    const stock = mkStock({
      dates: dates11,
      ma60: [120, null, null, null, null, 110, null, null, null, null, 100]
    })
    expect(ma60TurnUp.filter({ stock, fundamental: undefined, params: {} })).toBe(false)
  })
  it('does not match when data missing', () => {
    const stock = mkStock({
      dates: dates11,
      ma60: [null, null, null, null, null, null, null, null, null, null, 120]
    })
    expect(ma60TurnUp.filter({ stock, fundamental: undefined, params: {} })).toBe(false)
  })
})
