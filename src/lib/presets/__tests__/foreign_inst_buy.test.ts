import { describe, it, expect } from 'vitest'
import { foreignInstBuy } from '../foreign_inst_buy'
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

describe('foreignInstBuy preset', () => {
  it('matches when both net positive for N days', () => {
    const stock = mkStock({})
    const fundamental = mkFund({
      foreign_net: [100, 200, 300],
      institution_net: [50, 150, 250]
    })
    expect(foreignInstBuy.filter({ stock, fundamental, params: { N: 3 } })).toBe(true)
  })
  it('does not match when one day is negative', () => {
    const stock = mkStock({})
    const fundamental = mkFund({
      foreign_net: [100, -50, 300],
      institution_net: [50, 150, 250]
    })
    expect(foreignInstBuy.filter({ stock, fundamental, params: { N: 3 } })).toBe(false)
  })
  it('does not match when insufficient history', () => {
    const stock = mkStock({})
    const fundamental = mkFund({
      foreign_net: [100, 200],
      institution_net: [50, 150]
    })
    expect(foreignInstBuy.filter({ stock, fundamental, params: { N: 3 } })).toBe(false)
  })
})
