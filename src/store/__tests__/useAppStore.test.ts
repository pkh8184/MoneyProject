import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../useAppStore'

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({ mode: 'beginner', theme: 'light' })
    localStorage.clear()
  })

  it('default mode is beginner', () => {
    expect(useAppStore.getState().mode).toBe('beginner')
  })

  it('default theme is light', () => {
    expect(useAppStore.getState().theme).toBe('light')
  })

  it('setMode changes mode and persists to localStorage', () => {
    useAppStore.getState().setMode('expert')
    expect(useAppStore.getState().mode).toBe('expert')
    expect(localStorage.getItem('app-mode')).toBe('expert')
  })

  it('setTheme changes theme and persists to localStorage', () => {
    useAppStore.getState().setTheme('dark')
    expect(useAppStore.getState().theme).toBe('dark')
    expect(localStorage.getItem('app-theme')).toBe('dark')
  })

  it('hydrate loads mode and theme from localStorage', () => {
    localStorage.setItem('app-mode', 'expert')
    localStorage.setItem('app-theme', 'dark')
    useAppStore.getState().hydrate()
    expect(useAppStore.getState().mode).toBe('expert')
    expect(useAppStore.getState().theme).toBe('dark')
  })

  it('hydrate ignores invalid localStorage values', () => {
    localStorage.setItem('app-mode', 'invalid')
    localStorage.setItem('app-theme', 'purple')
    useAppStore.getState().hydrate()
    expect(useAppStore.getState().mode).toBe('beginner')
    expect(useAppStore.getState().theme).toBe('light')
  })
})
