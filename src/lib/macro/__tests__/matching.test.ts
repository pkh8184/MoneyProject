import { describe, it, expect } from 'vitest'
import { matchesFactor } from '../matching'

describe('matchesFactor', () => {
  it('matches by theme when stock has the theme', () => {
    const result = matchesFactor('삼성전자', ['반도체'], { themes: ['반도체'] })
    expect(result).toBe(true)
  })

  it('does not match by theme when stock lacks the theme', () => {
    const result = matchesFactor('호텔신라', ['유통'], { themes: ['반도체'] })
    expect(result).toBe(false)
  })

  it('matches by nameKeyword partial', () => {
    const result = matchesFactor('삼성전자', [], { nameKeywords: ['삼성전자'] })
    expect(result).toBe(true)
  })

  it('does not match when neither themes nor nameKeywords match', () => {
    const result = matchesFactor('알 수 없는 종목', ['기타'], {
      themes: ['반도체'],
      nameKeywords: ['삼성']
    })
    expect(result).toBe(false)
  })

  it('matches with OR relation: theme hit is enough', () => {
    const result = matchesFactor('아무이름', ['방산'], {
      themes: ['방산'],
      nameKeywords: ['삼성']
    })
    expect(result).toBe(true)
  })

  it('returns false when factor has no matching rules', () => {
    const result = matchesFactor('삼성전자', ['반도체'], {})
    expect(result).toBe(false)
  })

  it('handles undefined themes array', () => {
    const result = matchesFactor('삼성전자', undefined, { nameKeywords: ['삼성'] })
    expect(result).toBe(true)
  })

  it('handles empty themes array', () => {
    const result = matchesFactor('삼성전자', [], { themes: ['반도체'] })
    expect(result).toBe(false)
  })
})
