import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkRateLimit, _resetRateLimitStore } from '../rateLimit'

describe('checkRateLimit', () => {
  beforeEach(() => {
    _resetRateLimitStore()
    vi.useRealTimers()
  })

  it('allows first 5 attempts', () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit('1.2.3.4')).toBe(true)
    }
  })

  it('blocks 6th attempt within window', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('1.2.3.4')
    expect(checkRateLimit('1.2.3.4')).toBe(false)
  })

  it('allows different IPs independently', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('1.2.3.4')
    expect(checkRateLimit('5.6.7.8')).toBe(true)
  })

  it('resets after 15 minute window', () => {
    vi.useFakeTimers()
    const now = Date.now()
    vi.setSystemTime(now)

    for (let i = 0; i < 5; i++) checkRateLimit('1.2.3.4')
    expect(checkRateLimit('1.2.3.4')).toBe(false)

    vi.setSystemTime(now + 15 * 60 * 1000 + 1000)
    expect(checkRateLimit('1.2.3.4')).toBe(true)
  })
})
