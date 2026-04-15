import { describe, it, expect } from 'vitest'
import { volumeSpike } from '../volume_spike'
import type { StockIndicators } from '@/lib/types/indicators'

function mkStock(overrides: Partial<StockIndicators>): StockIndicators {
  return {
    name: 'T', market: 'KOSPI',
    dates: ['2026-04-13', '2026-04-14'],
    close: [100, 100], volume: [1000, 1000],
    ma5: [null, null], ma20: [null, null], ma60: [null, null], ma120: [null, null],
    rsi14: [null, null],
    macd_line: [null, null], macd_signal: [null, null], macd_hist: [null, null],
    bb_upper: [null, null], bb_middle: [null, null], bb_lower: [null, null],
    high52w: null, has_52w: false, vol_avg20: null,
    ...overrides
  }
}

describe('volumeSpike preset', () => {
  it('matches when 2x volume and rising close', () => {
    const stock = mkStock({ close: [95, 105], volume: [1000, 2000], vol_avg20: 1000 })
    expect(volumeSpike.filter({ stock, fundamental: undefined, params: {} })).toBe(true)
  })
  it('does not match when 2x volume but falling close', () => {
    const stock = mkStock({ close: [105, 95], volume: [1000, 2000], vol_avg20: 1000 })
    expect(volumeSpike.filter({ stock, fundamental: undefined, params: {} })).toBe(false)
  })
  it('does not match when 1x volume even with rising close', () => {
    const stock = mkStock({ close: [95, 105], volume: [1000, 1000], vol_avg20: 1000 })
    expect(volumeSpike.filter({ stock, fundamental: undefined, params: {} })).toBe(false)
  })
})
