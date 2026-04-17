import { describe, it, expect } from 'vitest'
import { computeMacroBonus } from '../scoring'
import type { MacroFactor } from '../types'

function mkFactor(id: string, benefThemes: string[] = [], lossThemes: string[] = []): MacroFactor {
  return {
    id,
    category: 'theme',
    level: 'opportunity',
    emoji: '🟢',
    name: id,
    desc: '',
    beneficiaries: { themes: benefThemes },
    losers: { themes: lossThemes },
    defaultActive: false
  }
}

describe('computeMacroBonus', () => {
  it('returns 0 when no active factors', () => {
    const result = computeMacroBonus('삼성전자', ['반도체'], [])
    expect(result.total).toBe(0)
    expect(result.detail).toHaveLength(0)
  })

  it('adds +5 for benefit match', () => {
    const f = mkFactor('ai_boom', ['반도체'])
    const result = computeMacroBonus('삼성전자', ['반도체'], [f])
    expect(result.total).toBe(5)
    expect(result.detail).toHaveLength(1)
    expect(result.detail[0].role).toBe('benefit')
    expect(result.detail[0].delta).toBe(5)
  })

  it('subtracts 5 for loser match', () => {
    const f = mkFactor('domestic_down', [], ['유통'])
    const result = computeMacroBonus('호텔신라', ['유통'], [f])
    expect(result.total).toBe(-5)
    expect(result.detail[0].role).toBe('loss')
    expect(result.detail[0].delta).toBe(-5)
  })

  it('offsets to 0 when stock matches both benefit and loser of same factor', () => {
    const f = mkFactor('mixed', ['반도체'], ['반도체'])
    const result = computeMacroBonus('삼성전자', ['반도체'], [f])
    expect(result.total).toBe(0)
    expect(result.detail).toHaveLength(0)
  })

  it('accumulates across multiple factors', () => {
    const f1 = mkFactor('ai', ['AI'])
    const f2 = mkFactor('semi', ['반도체'])
    const result = computeMacroBonus('삼성전자', ['AI', '반도체'], [f1, f2])
    expect(result.total).toBe(10)
    expect(result.detail).toHaveLength(2)
  })

  it('mixes benefit and loss from different factors', () => {
    const f1 = mkFactor('benefit', ['AI'])
    const f2 = mkFactor('loss', [], ['AI'])
    const result = computeMacroBonus('삼성전자', ['AI'], [f1, f2])
    expect(result.total).toBe(0)
    expect(result.detail).toHaveLength(2)
  })

  it('ignores factor when no match (benefit nor loss)', () => {
    const f = mkFactor('unrelated', ['방산'])
    const result = computeMacroBonus('삼성전자', ['반도체'], [f])
    expect(result.total).toBe(0)
    expect(result.detail).toHaveLength(0)
  })
})
