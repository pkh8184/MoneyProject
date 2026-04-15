import { describe, it, expect } from 'vitest'
import { getLevel, isOverWarning, isOverCritical } from '../thresholds.mjs'

describe('getLevel', () => {
  it('returns ok under 80%', () => {
    expect(getLevel(50, 100)).toBe('ok')
  })
  it('returns warning at 80%', () => {
    expect(getLevel(80, 100)).toBe('warning')
  })
  it('returns warning between 80 and 95', () => {
    expect(getLevel(90, 100)).toBe('warning')
  })
  it('returns critical at 95%', () => {
    expect(getLevel(95, 100)).toBe('critical')
  })
  it('handles zero limit gracefully', () => {
    expect(getLevel(0, 0)).toBe('ok')
  })
})

describe('isOverWarning / isOverCritical', () => {
  it('isOverWarning true at 80%', () => {
    expect(isOverWarning(80, 100)).toBe(true)
  })
  it('isOverWarning false at 79%', () => {
    expect(isOverWarning(79, 100)).toBe(false)
  })
  it('isOverCritical true at 95%', () => {
    expect(isOverCritical(95, 100)).toBe(true)
  })
  it('isOverCritical false at 94%', () => {
    expect(isOverCritical(94, 100)).toBe(false)
  })
})
