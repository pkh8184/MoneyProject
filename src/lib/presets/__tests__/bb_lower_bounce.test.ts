import { describe, it, expect } from 'vitest'
import { bbLowerBounce } from '../bb_lower_bounce'
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

describe('bbLowerBounce preset', () => {
  it('matches when price was below lower band yesterday and back today', () => {
    const stock = mkStock({ close: [90, 100], bb_lower: [95, 95] })
    expect(bbLowerBounce.filter({ stock, fundamental: undefined, params: {} })).toBe(true)
  })
  it('does not match when price stays below', () => {
    const stock = mkStock({ close: [90, 92], bb_lower: [95, 95] })
    expect(bbLowerBounce.filter({ stock, fundamental: undefined, params: {} })).toBe(false)
  })
  it('does not match when never broke below', () => {
    const stock = mkStock({ close: [100, 105], bb_lower: [95, 95] })
    expect(bbLowerBounce.filter({ stock, fundamental: undefined, params: {} })).toBe(false)
  })
})
