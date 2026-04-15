import { describe, it, expect } from 'vitest'
import { rsiRebound } from '../rsi_rebound'
import type { StockIndicators } from '@/lib/types/indicators'

// Build a 21-day stock
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

describe('rsiRebound preset', () => {
  it('matches when RSI rebounded above 30 and MA60 rising', () => {
    // RSI14: positions [...5 nulls..., 25, 28, 29, 28, 27, 35]  last 6: oversold in 5, then >30 today
    const rsi = Array(21).fill(null) as (number | null)[]
    rsi[15] = 25; rsi[16] = 28; rsi[17] = 29; rsi[18] = 28; rsi[19] = 27; rsi[20] = 35
    const ma60 = Array(21).fill(null) as (number | null)[]
    ma60[0] = 100; ma60[20] = 120  // today > 20 days ago
    const stock = build({ rsi14: rsi, ma60 })
    expect(rsiRebound.filter({ stock, fundamental: undefined, params: {} })).toBe(true)
  })
  it('does not match when MA60 is declining', () => {
    const rsi = Array(21).fill(null) as (number | null)[]
    rsi[15] = 25; rsi[16] = 28; rsi[17] = 29; rsi[18] = 28; rsi[19] = 27; rsi[20] = 35
    const ma60 = Array(21).fill(null) as (number | null)[]
    ma60[0] = 120; ma60[20] = 100
    const stock = build({ rsi14: rsi, ma60 })
    expect(rsiRebound.filter({ stock, fundamental: undefined, params: {} })).toBe(false)
  })
  it('does not match when RSI never dipped to 30', () => {
    const rsi = Array(21).fill(null) as (number | null)[]
    rsi[15] = 50; rsi[16] = 52; rsi[17] = 55; rsi[18] = 53; rsi[19] = 51; rsi[20] = 60
    const ma60 = Array(21).fill(null) as (number | null)[]
    ma60[0] = 100; ma60[20] = 120
    const stock = build({ rsi14: rsi, ma60 })
    expect(rsiRebound.filter({ stock, fundamental: undefined, params: {} })).toBe(false)
  })
})
