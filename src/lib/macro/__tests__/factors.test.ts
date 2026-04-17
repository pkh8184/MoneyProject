import { describe, it, expect } from 'vitest'
import { macroFactors } from '../factors'

describe('macroFactors data', () => {
  it('has exactly 30 factors', () => {
    expect(macroFactors).toHaveLength(30)
  })

  it('all factor ids are unique', () => {
    const ids = macroFactors.map((f) => f.id)
    expect(new Set(ids).size).toBe(30)
  })

  it('all factors have valid category', () => {
    const valid = ['geopolitics', 'rates', 'commodity', 'domestic', 'theme', 'sentiment']
    for (const f of macroFactors) {
      expect(valid).toContain(f.category)
    }
  })

  it('all factors have valid level', () => {
    const valid = ['danger', 'caution', 'opportunity']
    for (const f of macroFactors) {
      expect(valid).toContain(f.level)
    }
  })

  it('each factor has at least one matching rule (benefit or loser)', () => {
    for (const f of macroFactors) {
      const benefitHas =
        (f.beneficiaries.themes?.length ?? 0) > 0 ||
        (f.beneficiaries.nameKeywords?.length ?? 0) > 0
      const loserHas =
        (f.losers.themes?.length ?? 0) > 0 ||
        (f.losers.nameKeywords?.length ?? 0) > 0
      expect(benefitHas || loserHas).toBe(true)
    }
  })

  it('category distribution matches spec (7+5+5+5+5+3)', () => {
    const count = (cat: string) => macroFactors.filter((f) => f.category === cat).length
    expect(count('geopolitics')).toBe(7)
    expect(count('rates')).toBe(5)
    expect(count('commodity')).toBe(5)
    expect(count('domestic')).toBe(5)
    expect(count('theme')).toBe(5)
    expect(count('sentiment')).toBe(3)
  })

  it('all factors have weight between 3 and 10', () => {
    for (const f of macroFactors) {
      expect(f.weight).toBeGreaterThanOrEqual(3)
      expect(f.weight).toBeLessThanOrEqual(10)
    }
  })

  it('weight distribution matches spec', () => {
    const count = (w: number) => macroFactors.filter((f) => f.weight === w).length
    expect(count(10)).toBe(3)
    expect(count(8)).toBe(6)
    expect(count(7)).toBe(6)
    expect(count(5)).toBe(9)
    expect(count(3)).toBe(6)
  })
})
