import { describe, it, expect } from 'vitest'
import { high52w } from '../high_52w'
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

describe('high52w preset', () => {
  it('matches when close equals 100% of 52w high with default ratio', () => {
    const stock = mkStock({ close: [90, 100], high52w: 100, has_52w: true })
    expect(high52w.filter({ stock, fundamental: undefined, params: {} })).toBe(true)
  })
  it('matches when close at 90% and ratio set to 0.9', () => {
    const stock = mkStock({ close: [85, 90], high52w: 100, has_52w: true })
    expect(high52w.filter({ stock, fundamental: undefined, params: { ratio: 0.9 } })).toBe(true)
  })
  it('does not match when close at 70% and ratio 0.9', () => {
    const stock = mkStock({ close: [60, 70], high52w: 100, has_52w: true })
    expect(high52w.filter({ stock, fundamental: undefined, params: { ratio: 0.9 } })).toBe(false)
  })
  it('rejects when has_52w is false', () => {
    const stock = mkStock({ close: [100, 100], high52w: 100, has_52w: false })
    expect(high52w.filter({ stock, fundamental: undefined, params: {} })).toBe(false)
  })
})
