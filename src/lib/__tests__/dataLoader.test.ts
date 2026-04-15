import { describe, it, expect } from 'vitest'
import { getFreshnessLevel, formatRelative } from '../dataLoader'

describe('getFreshnessLevel', () => {
  const now = new Date('2026-04-14T18:00:00+09:00').getTime()

  it('returns fresh within 24h', () => {
    const updated = now - 5 * 60 * 60 * 1000
    expect(getFreshnessLevel(updated, now)).toBe('fresh')
  })

  it('returns stale24h between 24h and 48h', () => {
    const updated = now - 30 * 60 * 60 * 1000
    expect(getFreshnessLevel(updated, now)).toBe('stale24h')
  })

  it('returns stale48h beyond 48h', () => {
    const updated = now - 72 * 60 * 60 * 1000
    expect(getFreshnessLevel(updated, now)).toBe('stale48h')
  })

  it('boundary: exactly 24h is still fresh', () => {
    const updated = now - 24 * 60 * 60 * 1000
    expect(getFreshnessLevel(updated, now)).toBe('fresh')
  })
})

describe('formatRelative', () => {
  const now = new Date('2026-04-14T18:00:00+09:00').getTime()

  it('minutes ago', () => {
    const updated = now - 10 * 60 * 1000
    expect(formatRelative(updated, now)).toBe('10분 전')
  })

  it('hours ago', () => {
    const updated = now - 3 * 60 * 60 * 1000
    expect(formatRelative(updated, now)).toBe('3시간 전')
  })

  it('days ago', () => {
    const updated = now - 2 * 24 * 60 * 60 * 1000
    expect(formatRelative(updated, now)).toBe('2일 전')
  })

  it('just now for less than 1 minute', () => {
    const updated = now - 30 * 1000
    expect(formatRelative(updated, now)).toBe('방금 전')
  })
})
