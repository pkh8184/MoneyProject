import { describe, it, expect } from 'vitest'
import { goldenCross } from '../golden_cross'
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

describe('goldenCross preset', () => {
  it('matches when ma20 crosses above ma60 today', () => {
    const stock = mkStock({ ma20: [99, 101], ma60: [100, 100] })
    expect(goldenCross.filter({ stock, fundamental: undefined, params: {} })).toBe(true)
  })
  it('does not match when already crossed yesterday', () => {
    const stock = mkStock({ ma20: [102, 103], ma60: [100, 100] })
    expect(goldenCross.filter({ stock, fundamental: undefined, params: {} })).toBe(false)
  })
  it('does not match when ma20 still below', () => {
    const stock = mkStock({ ma20: [90, 95], ma60: [100, 100] })
    expect(goldenCross.filter({ stock, fundamental: undefined, params: {} })).toBe(false)
  })
  it('does not match when data missing', () => {
    const stock = mkStock({ ma20: [null, null], ma60: [100, 100] })
    expect(goldenCross.filter({ stock, fundamental: undefined, params: {} })).toBe(false)
  })
})
