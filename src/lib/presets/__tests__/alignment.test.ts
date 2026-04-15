import { describe, it, expect } from 'vitest'
import { alignment } from '../alignment'
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

describe('alignment preset', () => {
  it('matches on first day of MA alignment', () => {
    const stock = mkStock({
      ma5: [120, 140], ma20: [130, 130], ma60: [110, 120], ma120: [100, 110]
    })
    expect(alignment.filter({ stock, fundamental: undefined, params: {} })).toBe(true)
  })
  it('does not match when already aligned yesterday', () => {
    const stock = mkStock({
      ma5: [140, 150], ma20: [130, 140], ma60: [120, 130], ma120: [110, 120]
    })
    expect(alignment.filter({ stock, fundamental: undefined, params: {} })).toBe(false)
  })
  it('does not match when not aligned today', () => {
    const stock = mkStock({
      ma5: [120, 110], ma20: [130, 130], ma60: [110, 120], ma120: [100, 110]
    })
    expect(alignment.filter({ stock, fundamental: undefined, params: {} })).toBe(false)
  })
})
