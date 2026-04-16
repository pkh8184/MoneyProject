import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFirstVisit } from '../useFirstVisit'

describe('useFirstVisit', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns true on first visit', () => {
    const { result } = renderHook(() => useFirstVisit('watchlist'))
    expect(result.current[0]).toBe(true)
  })

  it('returns false after markVisited called', () => {
    const { result, rerender } = renderHook(() => useFirstVisit('watchlist'))
    act(() => result.current[1]())
    rerender()
    expect(result.current[0]).toBe(false)
  })

  it('persists across hook re-mount', () => {
    const first = renderHook(() => useFirstVisit('portfolio'))
    act(() => first.result.current[1]())
    first.unmount()
    const second = renderHook(() => useFirstVisit('portfolio'))
    expect(second.result.current[0]).toBe(false)
  })
})
