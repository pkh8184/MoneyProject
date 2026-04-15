import { create } from 'zustand'

export type ThemeKey = 'light' | 'dark'

interface AppState {
  theme: ThemeKey
  setTheme: (t: ThemeKey) => void
  hydrate: () => void
}

const THEME_KEY = 'app-theme'

function isValidTheme(v: unknown): v is ThemeKey {
  return v === 'light' || v === 'dark'
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'light',
  setTheme: (t) => {
    if (typeof window !== 'undefined') localStorage.setItem(THEME_KEY, t)
    set({ theme: t })
  },
  hydrate: () => {
    if (typeof window === 'undefined') return
    const savedTheme = localStorage.getItem(THEME_KEY)
    const theme = isValidTheme(savedTheme) ? savedTheme : 'light'
    set({ theme })
  }
}))
