import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStore } from '../useLocalStore'

describe('useLocalStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns initial value when key absent', () => {
    const { result } = renderHook(() => useLocalStore('test:key', { count: 0 }))
    expect(result.current[0]).toEqual({ count: 0 })
  })

  it('persists value to localStorage', () => {
    const { result } = renderHook(() => useLocalStore('test:key', { count: 0 }))
    act(() => result.current[1]({ count: 5 }))
    expect(result.current[0]).toEqual({ count: 5 })
    const raw = localStorage.getItem('test:key')
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!)).toEqual({ version: 1, data: { count: 5 } })
  })

  it('loads existing value from localStorage', () => {
    localStorage.setItem('test:key', JSON.stringify({ version: 1, data: { count: 99 } }))
    const { result } = renderHook(() => useLocalStore('test:key', { count: 0 }))
    expect(result.current[0]).toEqual({ count: 99 })
  })

  it('uses initial value if stored data has wrong version', () => {
    localStorage.setItem('test:key', JSON.stringify({ version: 99, data: { count: 7 } }))
    const { result } = renderHook(() => useLocalStore('test:key', { count: 0 }))
    expect(result.current[0]).toEqual({ count: 0 })
  })

  it('supports updater function', () => {
    const { result } = renderHook(() => useLocalStore('test:key', { count: 0 }))
    act(() => result.current[1]((prev) => ({ count: prev.count + 1 })))
    expect(result.current[0]).toEqual({ count: 1 })
  })
})
