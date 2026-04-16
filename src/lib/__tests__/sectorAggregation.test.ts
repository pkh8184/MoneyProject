import { describe, it, expect } from 'vitest'
import { aggregateSectors, type SectorAggregate } from '../sectorAggregation'
import type {
  IndicatorsJson,
  FundamentalsJson,
  SectorsJson,
  StockIndicators
} from '@/lib/types/indicators'

function mkStock(close: number[]): StockIndicators {
  return {
    name: 'X',
    market: 'KOSPI',
    dates: close.map((_, i) => `2026-04-${String(i + 1).padStart(2, '0')}`),
    close,
    volume: close.map(() => 100),
    ma5: [],
    ma20: [],
    ma60: [],
    ma120: [],
    rsi14: [],
    macd_line: [],
    macd_signal: [],
    macd_hist: [],
    bb_upper: [],
    bb_middle: [],
    bb_lower: [],
    high52w: null,
    has_52w: false,
    vol_avg20: null
  }
}

describe('aggregateSectors', () => {
  it('groups stocks by sector and computes weighted average return', () => {
    const indicators: IndicatorsJson = {
      meta: { updated_at: '', trade_date: '', stock_count: 0, days: 30 },
      A: { ...mkStock([100, 110]), name: 'A' }, // +10%
      B: { ...mkStock([100, 105]), name: 'B' }, //  +5%
      C: { ...mkStock([100, 95]), name: 'C' } //  -5%
    } as IndicatorsJson
    const fundamentals: FundamentalsJson = {
      A: { pbr: null, per: null, market_cap: 1000, foreign_net: [], institution_net: [] },
      B: { pbr: null, per: null, market_cap: 1000, foreign_net: [], institution_net: [] },
      C: { pbr: null, per: null, market_cap: 2000, foreign_net: [], institution_net: [] }
    }
    const sectors: SectorsJson = {
      A: { sector: '반도체', industry: '', themes: [] },
      B: { sector: '반도체', industry: '', themes: [] },
      C: { sector: '바이오', industry: '', themes: [] }
    }

    const result: SectorAggregate[] = aggregateSectors(indicators, fundamentals, sectors)

    const semi = result.find((r) => r.sector === '반도체')!
    expect(semi.totalMarketCap).toBe(2000)
    expect(semi.weightedReturnPct).toBeCloseTo(7.5, 2) // (10*1000 + 5*1000) / 2000

    const bio = result.find((r) => r.sector === '바이오')!
    expect(bio.weightedReturnPct).toBeCloseTo(-5, 2)
  })

  it('puts stocks without sector under "미분류"', () => {
    const indicators: IndicatorsJson = {
      meta: { updated_at: '', trade_date: '', stock_count: 0, days: 30 },
      X: { ...mkStock([100, 102]), name: 'X' }
    } as IndicatorsJson
    const fundamentals: FundamentalsJson = {
      X: { pbr: null, per: null, market_cap: 500, foreign_net: [], institution_net: [] }
    }
    const sectors: SectorsJson = {}

    const result = aggregateSectors(indicators, fundamentals, sectors)
    expect(result.find((r) => r.sector === '미분류')).toBeDefined()
  })

  it('skips stocks with fewer than 2 close points', () => {
    const indicators: IndicatorsJson = {
      meta: { updated_at: '', trade_date: '', stock_count: 0, days: 30 },
      Y: { ...mkStock([100]), name: 'Y' }
    } as IndicatorsJson
    const fundamentals: FundamentalsJson = {
      Y: { pbr: null, per: null, market_cap: 500, foreign_net: [], institution_net: [] }
    }
    const sectors: SectorsJson = { Y: { sector: '반도체', industry: '', themes: [] } }

    const result = aggregateSectors(indicators, fundamentals, sectors)
    expect(result).toHaveLength(0)
  })
})
