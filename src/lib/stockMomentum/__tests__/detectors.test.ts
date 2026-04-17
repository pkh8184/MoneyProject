// src/lib/stockMomentum/__tests__/detectors.test.ts
import { describe, it, expect } from 'vitest'
import {
  detectShortTermTrendChange,
  detectVolumeAnomaly,
  detectRsiRebound,
  detectNewHighBreak,
  detectBbLowerBounce,
  detectSupplyStrong,
  detectMacroBenefit,
  detectMlBullish,
  detectHistoricalWinner,
  detectBowlPhase3,
  detectOverheatedWarning,
  detectDownTrendWarning
} from '../detectors'
import type { DetectContext } from '../types'
import type { StockIndicators } from '@/lib/types/indicators'

function mkStock(overrides: Partial<StockIndicators> = {}): StockIndicators {
  return {
    name: 'T', market: 'KOSPI',
    dates: Array.from({ length: 30 }, (_, i) => `2026-04-${String(i + 1).padStart(2, '0')}`),
    close: Array(30).fill(1000),
    volume: Array(30).fill(1000),
    open: Array(30).fill(1000),
    high: Array(30).fill(1000),
    low: Array(30).fill(1000),
    ma5: Array(30).fill(1000),
    ma20: Array(30).fill(1000),
    ma60: Array(30).fill(1000),
    ma120: Array(30).fill(1000),
    rsi14: Array(30).fill(50),
    macd_line: Array(30).fill(0),
    macd_signal: Array(30).fill(0),
    macd_hist: Array(30).fill(0),
    bb_upper: Array(30).fill(1100),
    bb_middle: Array(30).fill(1000),
    bb_lower: Array(30).fill(900),
    high52w: 1200,
    has_52w: true,
    vol_avg20: 1000,
    ...overrides
  }
}

function ctx(partial: Partial<DetectContext> = {}): DetectContext {
  return { stock: mkStock(), ...partial }
}

describe('detectShortTermTrendChange', () => {
  it('returns null when no conditions met', () => {
    expect(detectShortTermTrendChange(ctx())).toBeNull()
  })
  it('detects golden cross within 3 days', () => {
    const ma20 = Array(30).fill(100)
    const ma60 = Array(30).fill(100)
    ma60[28] = 101; ma20[28] = 99
    ma60[29] = 99; ma20[29] = 101  // today: 20 > 60, yesterday: 20 < 60
    const s = detectShortTermTrendChange(ctx({ stock: mkStock({ ma20, ma60 }) }))
    expect(s).not.toBeNull()
    expect(s!.strength).toBeGreaterThanOrEqual(1)
  })
  it('detects 3+ conditions as strength 3', () => {
    const stock = mkStock({
      ma20: Array(30).fill(100).map((v, i) => i === 28 ? 99 : i === 29 ? 101 : v),
      ma60: Array(30).fill(100).map((v, i) => i === 28 ? 101 : i === 29 ? 99 : v),
      macd_line: Array(30).fill(0).map((v, i) => i === 28 ? -1 : i === 29 ? 1 : v),
      macd_signal: Array(30).fill(0).map((v, i) => i === 28 ? 0 : i === 29 ? 0 : v),
      macd_hist: Array(30).fill(0).map((v, i) => i === 28 ? -1 : i === 29 ? 1 : v)
    })
    const s = detectShortTermTrendChange(ctx({ stock }))
    expect(s).not.toBeNull()
    expect(s!.strength).toBe(3)
  })
})

describe('detectVolumeAnomaly', () => {
  it('returns null for normal volume', () => {
    expect(detectVolumeAnomaly(ctx())).toBeNull()
  })
  it('detects spike with bull candle', () => {
    const volume = Array(30).fill(1000)
    volume[29] = 2000  // 2x vol_avg20=1000
    const close = Array(30).fill(1000)
    close[29] = 1050  // bull candle
    const s = detectVolumeAnomaly(ctx({ stock: mkStock({ volume, close, vol_avg20: 1000 }) }))
    expect(s).not.toBeNull()
  })
})

describe('detectRsiRebound', () => {
  it('returns null when no rebound', () => {
    expect(detectRsiRebound(ctx())).toBeNull()
  })
  it('detects oversold exit (A) with strength 2', () => {
    const rsi14 = Array(30).fill(50)
    rsi14[28] = 28; rsi14[29] = 32
    const s = detectRsiRebound(ctx({ stock: mkStock({ rsi14 }) }))
    expect(s).not.toBeNull()
    expect(s!.strength).toBe(2)
    expect(s!.label).toContain('과매도 이탈')
  })
  it('detects healthy momentum (C) with strength 1', () => {
    const rsi14 = Array(30).fill(55)
    rsi14[29] = 60
    const s = detectRsiRebound(ctx({ stock: mkStock({ rsi14 }) }))
    expect(s).not.toBeNull()
    expect(s!.strength).toBe(1)
  })
})

describe('detectNewHighBreak', () => {
  it('returns null when not near high', () => {
    expect(detectNewHighBreak(ctx())).toBeNull()
  })
  it('detects 52w break with strength 3', () => {
    const close = Array(30).fill(1000)
    close[28] = 1150
    close[29] = 1200
    const s = detectNewHighBreak(ctx({ stock: mkStock({ close, high52w: 1200, has_52w: true }) }))
    expect(s).not.toBeNull()
    expect(s!.strength).toBe(3)
  })
})

describe('detectBbLowerBounce', () => {
  it('returns null if no touch', () => {
    expect(detectBbLowerBounce(ctx())).toBeNull()
  })
  it('detects single touch bounce with strength 2', () => {
    const close = Array(30).fill(1000)
    const bb_lower = Array(30).fill(900)
    close[28] = 890  // touch
    close[29] = 910  // bounce
    const s = detectBbLowerBounce(ctx({ stock: mkStock({ close, bb_lower }) }))
    expect(s).not.toBeNull()
    expect(s!.strength).toBe(2)
  })
})

describe('detectSupplyStrong', () => {
  it('returns null without fundamental', () => {
    expect(detectSupplyStrong(ctx())).toBeNull()
  })
  it('detects foreign streak with strength 1', () => {
    const s = detectSupplyStrong(ctx({
      fundamental: {
        pbr: null, per: null, market_cap: 1e9,
        foreign_net: [1, 1, 1, 1, 1, 1, 1, -1, -1, -1],  // 7 positive = exactly 7
        institution_net: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
      }
    }))
    // slice(-10).filter > 0: [1,1,1,1,1,1,1,-1,-1,-1] has 7 positives → streak true
    expect(s).not.toBeNull()
  })
  it('detects both streak with strength 3', () => {
    const ones = Array(10).fill(1)
    const s = detectSupplyStrong(ctx({
      fundamental: { pbr: null, per: null, market_cap: 1e9, foreign_net: ones, institution_net: ones }
    }))
    expect(s).not.toBeNull()
    expect(s!.strength).toBe(3)
  })
})

describe('detectMacroBenefit', () => {
  it('returns null when nothing', () => {
    expect(detectMacroBenefit(ctx())).toBeNull()
  })
  it('detects with sector only', () => {
    const s = detectMacroBenefit(ctx({
      macroBonus: { total: 0, detail: [] },
      sectorRotation: { sectorRotationDelta: 3, activeSector: '반도체', rank: 'strong' }
    }))
    expect(s).not.toBeNull()
    expect(s!.strength).toBe(1)
  })
  it('detects strength 3 when factor+sector sum ≥ 15', () => {
    const s = detectMacroBenefit(ctx({
      macroBonus: { total: 12, detail: [] },
      sectorRotation: { sectorRotationDelta: 3, activeSector: '반도체', rank: 'strong' }
    }))
    expect(s).not.toBeNull()
    expect(s!.strength).toBe(3)
  })
})

describe('detectMlBullish', () => {
  it('returns null without ML', () => {
    expect(detectMlBullish(ctx())).toBeNull()
  })
  it('returns null below 0.6', () => {
    const s = detectMlBullish(ctx({ mlPrediction: { probability: 0.5, ml_score: 5, top_features: [] } }))
    expect(s).toBeNull()
  })
  it('strength 3 at 0.85+', () => {
    const s = detectMlBullish(ctx({ mlPrediction: { probability: 0.9, ml_score: 20, top_features: [] } }))
    expect(s!.strength).toBe(3)
  })
})

describe('detectHistoricalWinner', () => {
  it('returns null without stats', () => {
    expect(detectHistoricalWinner(ctx())).toBeNull()
  })
  it('returns null when win rate < 60', () => {
    const s = detectHistoricalWinner(ctx({
      patternStats: { foo: { sample_count: 10, d1: { avg: 0, max: 0, win_rate: 0 }, d3: { avg: 0, max: 0, win_rate: 0 }, d7: { avg: 1, max: 0, win_rate: 50 } } },
      matchedPresetIds: ['foo']
    }))
    expect(s).toBeNull()
  })
  it('strength 2 at 70~80 win rate', () => {
    const s = detectHistoricalWinner(ctx({
      patternStats: { foo: { sample_count: 10, d1: { avg: 0, max: 0, win_rate: 0 }, d3: { avg: 0, max: 0, win_rate: 0 }, d7: { avg: 2, max: 0, win_rate: 75 } } },
      matchedPresetIds: ['foo']
    }))
    expect(s!.strength).toBe(2)
  })
})

describe('detectBowlPhase3', () => {
  it('returns null when not phase 3', () => {
    expect(detectBowlPhase3(ctx())).toBeNull()
  })
  it('detects phase 3', () => {
    const s = detectBowlPhase3(ctx({
      stock: mkStock({
        bowl_low_90d: 900, bowl_days_since_low: 20,
        bowl_low_was_inverted: true,
        bowl_has_recent_golden_cross: true,
        bowl_current_aligned: false,
        bowl_volume_score: 60
      })
    }))
    expect(s).not.toBeNull()
    expect(s!.strength).toBe(1)
  })
  it('strength 3 with volume score + GC', () => {
    const s = detectBowlPhase3(ctx({
      stock: mkStock({
        bowl_low_90d: 900, bowl_days_since_low: 20,
        bowl_low_was_inverted: true,
        bowl_has_recent_golden_cross: true,
        bowl_current_aligned: false,
        bowl_volume_score: 80
      })
    }))
    expect(s!.strength).toBe(3)
  })
})

describe('detectOverheatedWarning', () => {
  it('returns null when normal', () => {
    expect(detectOverheatedWarning(ctx())).toBeNull()
  })
  it('detects RSI > 70', () => {
    const rsi14 = Array(30).fill(50); rsi14[29] = 75
    const s = detectOverheatedWarning(ctx({ stock: mkStock({ rsi14 }) }))
    expect(s).not.toBeNull()
    expect(s!.tone).toBe('warning')
  })
})

describe('detectDownTrendWarning', () => {
  it('returns null when normal', () => {
    expect(detectDownTrendWarning(ctx())).toBeNull()
  })
  it('detects bearish alignment', () => {
    const s = detectDownTrendWarning(ctx({
      stock: mkStock({
        ma5: Array(30).fill(90),
        ma20: Array(30).fill(95),
        ma60: Array(30).fill(100),
        ma120: Array(30).fill(110)
      })
    }))
    expect(s).not.toBeNull()
    expect(s!.tone).toBe('warning')
  })
})
