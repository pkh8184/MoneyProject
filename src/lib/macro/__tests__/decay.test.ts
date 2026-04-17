import { describe, it, expect } from 'vitest'
import { computeDecayFactor } from '../decay'

const DAY_MS = 24 * 60 * 60 * 1000

describe('computeDecayFactor', () => {
  it('returns 1 when activatedAtMs is undefined', () => {
    expect(computeDecayFactor(undefined)).toBe(1)
  })

  it('returns 1.0 when age < 14 days (e.g., just activated)', () => {
    const now = Date.now()
    expect(computeDecayFactor(now, now)).toBe(1.0)
  })

  it('returns 1.0 at 20 days? No — returns 0.85 at 20 days (14 <= age < 30)', () => {
    const now = Date.now()
    const activatedAt = now - 20 * DAY_MS
    expect(computeDecayFactor(activatedAt, now)).toBe(0.85)
  })

  it('returns 0.70 at 40 days (30 <= age < 60)', () => {
    const now = Date.now()
    const activatedAt = now - 40 * DAY_MS
    expect(computeDecayFactor(activatedAt, now)).toBe(0.70)
  })

  it('returns 0.50 at 75 days (60 <= age < 90)', () => {
    const now = Date.now()
    const activatedAt = now - 75 * DAY_MS
    expect(computeDecayFactor(activatedAt, now)).toBe(0.50)
  })

  it('returns 0.30 at 100 days (90 <= age < 120)', () => {
    const now = Date.now()
    const activatedAt = now - 100 * DAY_MS
    expect(computeDecayFactor(activatedAt, now)).toBe(0.30)
  })

  it('returns 0.20 at 150 days (age >= 120)', () => {
    const now = Date.now()
    const activatedAt = now - 150 * DAY_MS
    expect(computeDecayFactor(activatedAt, now)).toBe(0.20)
  })
})
