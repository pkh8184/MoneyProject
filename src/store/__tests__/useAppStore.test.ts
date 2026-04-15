import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../useAppStore'

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({ theme: 'light' })
    localStorage.clear()
  })

  it('default theme is light', () => {
    expect(useAppStore.getState().theme).toBe('light')
  })

  it('setTheme changes theme and persists to localStorage', () => {
    useAppStore.getState().setTheme('dark')
    expect(useAppStore.getState().theme).toBe('dark')
    expect(localStorage.getItem('app-theme')).toBe('dark')
  })

  it('hydrate loads theme from localStorage', () => {
    localStorage.setItem('app-theme', 'dark')
    useAppStore.getState().hydrate()
    expect(useAppStore.getState().theme).toBe('dark')
  })

  it('hydrate ignores invalid localStorage values', () => {
    localStorage.setItem('app-theme', 'purple')
    useAppStore.getState().hydrate()
    expect(useAppStore.getState().theme).toBe('light')
  })
})
