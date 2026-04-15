import { describe, it, expect } from 'vitest'
import { comboValueRebound } from '../combo_value_rebound'
import type { StockIndicators, Fundamental } from '@/lib/types/indicators'

function build(overrides: Partial<StockIndicators>): StockIndicators {
  const len = 21
  const dates = Array(len).fill(0).map((_, i) => `2026-03-${String(i + 1).padStart(2, '0')}`)
  const nullArr = Array(len).fill(null)
  return {
    name: 'T', market: 'KOSPI',
    dates,
    close: Array(len).fill(100), volume: Array(len).fill(1000),
    ma5: [...nullArr], ma20: [...nullArr], ma60: [...nullArr], ma120: [...nullArr],
    rsi14: [...nullArr],
    macd_line: [...nullArr], macd_signal: [...nullArr], macd_hist: [...nullArr],
    bb_upper: [...nullArr], bb_middle: [...nullArr], bb_lower: [...nullArr],
    high52w: null, has_52w: false, vol_avg20: null,
    ...overrides
  }
}

function mkFund(overrides: Partial<Fundamental>): Fundamental {
  return { pbr: null, per: null, market_cap: 0, foreign_net: [], institution_net: [], ...overrides }
}

function buildRsiRebound(): Partial<StockIndicators> {
  const rsi = Array(21).fill(null) as (number | null)[]
  rsi[15] = 25; rsi[16] = 28; rsi[17] = 29; rsi[18] = 28; rsi[19] = 27; rsi[20] = 35
  const ma60 = Array(21).fill(null) as (number | null)[]
  ma60[0] = 100; ma60[20] = 100  // 100 > 100 is false, make it rise
  ma60[20] = 110
  return { rsi14: rsi, ma60 }
}

describe('comboValueRebound preset', () => {
  it('matches when all conditions met', () => {
    const base = buildRsiRebound()
    // Close today: 112 (between 110 and 110*1.05=115.5)
    const close = Array(21).fill(100) as number[]
    close[20] = 112
    const stock = build({ ...base, close })
    const fundamental = mkFund({ pbr: 0.8 })
    expect(comboValueRebound.filter({ stock, fundamental, params: {} })).toBe(true)
  })
  it('does not match when close is too far above MA60', () => {
    const base = buildRsiRebound()
    const close = Array(21).fill(100) as number[]
    close[20] = 130  // > 110 * 1.05 = 115.5
    const stock = build({ ...base, close })
    const fundamental = mkFund({ pbr: 0.8 })
    expect(comboValueRebound.filter({ stock, fundamental, params: {} })).toBe(false)
  })
  it('does not match when no RSI rebound', () => {
    const ma60 = Array(21).fill(null) as (number | null)[]
    ma60[0] = 100; ma60[20] = 110
    const rsi = Array(21).fill(null) as (number | null)[]
    rsi[15] = 50; rsi[16] = 52; rsi[17] = 55; rsi[18] = 53; rsi[19] = 51; rsi[20] = 60
    const close = Array(21).fill(100) as number[]
    close[20] = 112
    const stock = build({ ma60, rsi14: rsi, close })
    const fundamental = mkFund({ pbr: 0.8 })
    expect(comboValueRebound.filter({ stock, fundamental, params: {} })).toBe(false)
  })
})
