import { describe, it, expect } from 'vitest'
import { comboGolden } from '../combo_golden'
import type { StockIndicators } from '@/lib/types/indicators'

function mkStock(overrides: Partial<StockIndicators>): StockIndicators {
  return {
    name: 'T', market: 'KOSPI',
    dates: ['2026-04-13', '2026-04-14'],
    close: [95, 105], volume: [1000, 2000],
    ma5: [null, null], ma20: [99, 101], ma60: [100, 100], ma120: [null, null],
    rsi14: [null, 60],
    macd_line: [null, null], macd_signal: [null, null], macd_hist: [null, null],
    bb_upper: [null, null], bb_middle: [null, null], bb_lower: [null, null],
    high52w: null, has_52w: false, vol_avg20: 1000,
    ...overrides
  }
}

describe('comboGolden preset', () => {
  it('matches when golden_cross + volume_spike + rsi>50', () => {
    const stock = mkStock({})
    expect(comboGolden.filter({ stock, fundamental: undefined, params: {} })).toBe(true)
  })
  it('does not match when volume is too low', () => {
    const stock = mkStock({ volume: [1000, 1000] })
    expect(comboGolden.filter({ stock, fundamental: undefined, params: {} })).toBe(false)
  })
  it('does not match when RSI is low', () => {
    const stock = mkStock({ rsi14: [null, 40] })
    expect(comboGolden.filter({ stock, fundamental: undefined, params: {} })).toBe(false)
  })
})
