import { describe, it, expect } from 'vitest'
import { lowPbr } from '../low_pbr'
import type { StockIndicators, Fundamental } from '@/lib/types/indicators'

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

function mkFund(overrides: Partial<Fundamental>): Fundamental {
  return {
    pbr: null, per: null, market_cap: 0,
    foreign_net: [], institution_net: [],
    ...overrides
  }
}

describe('lowPbr preset', () => {
  it('matches when pbr=0.8 and K=1.0', () => {
    const stock = mkStock({})
    const fundamental = mkFund({ pbr: 0.8 })
    expect(lowPbr.filter({ stock, fundamental, params: { K: 1.0 } })).toBe(true)
  })
  it('does not match when pbr=1.2 and K=1.0', () => {
    const stock = mkStock({})
    const fundamental = mkFund({ pbr: 1.2 })
    expect(lowPbr.filter({ stock, fundamental, params: { K: 1.0 } })).toBe(false)
  })
  it('rejects when pbr null', () => {
    const stock = mkStock({})
    const fundamental = mkFund({ pbr: null })
    expect(lowPbr.filter({ stock, fundamental, params: { K: 1.0 } })).toBe(false)
  })
})
