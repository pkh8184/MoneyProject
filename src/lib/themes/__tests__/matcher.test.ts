import { describe, it, expect } from 'vitest'
import { matchTheme, filterStocksByTheme } from '../matcher'

describe('matchTheme', () => {
  it('matches semiconductor for 반도체 keyword', () => {
    expect(matchTheme('semiconductor', { sector: '반도체', industry: '', themes: ['반도체'] })).toBe(true)
  })
  it('returns false for unrelated stock', () => {
    expect(matchTheme('battery', { sector: '', industry: '', themes: ['바이오'] })).toBe(false)
  })
  it('returns false for unknown theme id', () => {
    expect(matchTheme('unknown_id', { sector: '반도체', industry: '', themes: ['반도체'] })).toBe(false)
  })
  it('matches when any theme tag fits keywords', () => {
    expect(matchTheme('ai', { sector: '', industry: '', themes: ['AI'] })).toBe(true)
  })
})

describe('filterStocksByTheme', () => {
  it('filters stocks by theme id', () => {
    const sectors = {
      'A': { sector: '반도체', industry: '', themes: ['반도체'] },
      'B': { sector: '바이오', industry: '', themes: ['바이오'] },
      'C': { sector: '', industry: '', themes: ['반도체', 'AI'] }
    }
    const result = filterStocksByTheme(sectors, 'semiconductor')
    expect(result.sort()).toEqual(['A', 'C'])
  })
  it('returns empty for unknown theme', () => {
    const result = filterStocksByTheme({}, 'unknown')
    expect(result).toEqual([])
  })
})
