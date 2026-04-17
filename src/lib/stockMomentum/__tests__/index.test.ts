// src/lib/stockMomentum/__tests__/index.test.ts
import { describe, it, expect } from 'vitest'
import { analyzeMomentum } from '../index'
import type { DetectContext } from '../types'
import type { StockIndicators } from '@/lib/types/indicators'

function mkStock(overrides: Partial<StockIndicators> = {}): StockIndicators {
  return {
    name: 'T', market: 'KOSPI',
    dates: Array.from({ length: 30 }, (_, i) => `2026-04-${String(i + 1).padStart(2, '0')}`),
    close: Array(30).fill(1000), volume: Array(30).fill(1000),
    open: Array(30).fill(1000), high: Array(30).fill(1000), low: Array(30).fill(1000),
    ma5: Array(30).fill(1000), ma20: Array(30).fill(1000),
    ma60: Array(30).fill(1000), ma120: Array(30).fill(1000),
    rsi14: Array(30).fill(50),
    macd_line: Array(30).fill(0), macd_signal: Array(30).fill(0), macd_hist: Array(30).fill(0),
    bb_upper: Array(30).fill(1100), bb_middle: Array(30).fill(1000), bb_lower: Array(30).fill(900),
    high52w: 1200, has_52w: true, vol_avg20: 1000,
    ...overrides
  }
}

describe('analyzeMomentum', () => {
  it('returns empty when nothing matches', () => {
    const r = analyzeMomentum({ stock: mkStock() })
    expect(r.signals).toHaveLength(0)
    expect(r.bullishCount).toBe(0)
    expect(r.warningCount).toBe(0)
  })

  it('counts bullish and warning separately', () => {
    // RSI > 70 (warning) + volume spike (bullish)
    const volume = Array(30).fill(1000); volume[29] = 2000
    const close = Array(30).fill(1000); close[29] = 1050
    const rsi14 = Array(30).fill(50); rsi14[29] = 75
    const r = analyzeMomentum({
      stock: mkStock({ volume, close, rsi14, vol_avg20: 1000 })
    })
    expect(r.bullishCount).toBeGreaterThanOrEqual(1)
    expect(r.warningCount).toBeGreaterThanOrEqual(1)
  })

  it('sorts by category order then strength desc', () => {
    // chart 약한 신호 + ml 강한 신호
    const rsi14 = Array(30).fill(55); rsi14[29] = 60  // RSI C (⭐)
    const r = analyzeMomentum({
      stock: mkStock({ rsi14 }),
      mlPrediction: { probability: 0.9, ml_score: 20, top_features: [] }
    })
    const first = r.signals[0]
    expect(first.category).toBe('chart')  // chart가 ml보다 먼저
  })
})
