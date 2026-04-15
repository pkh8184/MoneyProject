import { describe, it, expect } from 'vitest'
import { runPreset, type FilterResult } from '../filter'
import { goldenCross } from '../presets/golden_cross'

function mkIndicatorStock(ma20: (number|null)[], ma60: (number|null)[], volume: number[]) {
  return {
    name: 'T', market: 'KOSPI' as const,
    dates: ['2026-04-13', '2026-04-14'],
    close: [100, 105], volume,
    ma5: [null, null], ma20, ma60, ma120: [null, null],
    rsi14: [null, null],
    macd_line: [null, null], macd_signal: [null, null], macd_hist: [null, null],
    bb_upper: [null, null], bb_middle: [null, null], bb_lower: [null, null],
    high52w: null, has_52w: false, vol_avg20: null
  }
}

describe('runPreset', () => {
  it('returns matching stocks sorted by score desc', () => {
    const indicators: any = {
      meta: { updated_at: '', trade_date: '2026-04-14', stock_count: 2, days: 30 },
      'AAA': { ...mkIndicatorStock([99, 101], [100, 100], [1000, 5000]), name: 'A' },
      'BBB': { ...mkIndicatorStock([99, 101], [100, 100], [2000, 3000]), name: 'B' }
    }
    const results = runPreset(goldenCross, indicators, {}, {})
    expect(results.length).toBe(2)
    expect(results[0].code).toBe('AAA')  // volume 5000 > 3000
    expect(results[0].score).toBeGreaterThan(results[1].score)
  })

  it('limits results to 100', () => {
    const indicators: any = { meta: { trade_date: '2026-04-14' } }
    for (let i = 0; i < 150; i++) {
      indicators[`T${String(i).padStart(3, '0')}`] = {
        ...mkIndicatorStock([99, 101], [100, 100], [1000 + i, 1000 + i]),
        name: `T${i}`
      }
    }
    const results = runPreset(goldenCross, indicators, {}, {})
    expect(results.length).toBe(100)
  })

  it('returns empty when no matches', () => {
    const indicators: any = { meta: {}, 'AAA': {
      name:'A', market:'KOSPI' as const,
      dates:['a','b'], close:[100,100], volume:[1000,1000],
      ma5:[null,null], ma20:[90, 90], ma60:[100,100], ma120:[null,null],
      rsi14:[null,null],
      macd_line:[null,null], macd_signal:[null,null], macd_hist:[null,null],
      bb_upper:[null,null], bb_middle:[null,null], bb_lower:[null,null],
      high52w:null, has_52w:false, vol_avg20:null
    }}
    const results = runPreset(goldenCross, indicators, {}, {})
    expect(results.length).toBe(0)
  })

  it('ignores stocks that throw in filter', () => {
    // Stock with malformed data that might throw
    const indicators: any = {
      meta: {},
      'GOOD': { ...mkIndicatorStock([99, 101], [100, 100], [1000, 2000]), name: 'Good' },
      'BAD': null  // will throw in Object.entries filter iteration
    }
    // Wrapping BAD as an object that throws on property access
    const badStock: any = {
      get ma20() { throw new Error('boom') },
      name: 'Bad', market: 'KOSPI',
      dates: [], close: [], volume: [],
      ma5: [], ma60: [], ma120: [], rsi14: [],
      macd_line: [], macd_signal: [], macd_hist: [],
      bb_upper: [], bb_middle: [], bb_lower: [],
      high52w: null, has_52w: false, vol_avg20: null
    }
    indicators.BAD = badStock
    const results = runPreset(goldenCross, indicators, {}, {})
    expect(results.length).toBe(1)
    expect(results[0].code).toBe('GOOD')
  })
})
