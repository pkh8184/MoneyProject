import { describe, it, expect } from 'vitest'
import { macdCross } from '../macd_cross'
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

describe('macdCross preset', () => {
  it('matches on cross with line > 0', () => {
    const stock = mkStock({ macd_line: [0.5, 1.2], macd_signal: [1.0, 1.0] })
    expect(macdCross.filter({ stock, fundamental: undefined, params: {} })).toBe(true)
  })
  it('rejects cross with line < 0 when above_zero=true', () => {
    const stock = mkStock({ macd_line: [-1.5, -0.5], macd_signal: [-1.0, -1.0] })
    expect(macdCross.filter({ stock, fundamental: undefined, params: { above_zero: true } })).toBe(false)
  })
  it('allows cross with line < 0 when above_zero=false', () => {
    const stock = mkStock({ macd_line: [-1.5, -0.5], macd_signal: [-1.0, -1.0] })
    expect(macdCross.filter({ stock, fundamental: undefined, params: { above_zero: false } })).toBe(true)
  })
  it('does not match when no cross', () => {
    const stock = mkStock({ macd_line: [0.5, 0.6], macd_signal: [1.0, 1.0] })
    expect(macdCross.filter({ stock, fundamental: undefined, params: {} })).toBe(false)
  })
})
