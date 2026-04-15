import { create } from 'zustand'
import type { ModeKey } from '@/lib/types/presets'

export type ThemeKey = 'light' | 'dark'

interface AppState {
  mode: ModeKey
  theme: ThemeKey
  setMode: (m: ModeKey) => void
  setTheme: (t: ThemeKey) => void
  hydrate: () => void
}

const MODE_KEY = 'app-mode'
const THEME_KEY = 'app-theme'

function isValidMode(v: unknown): v is ModeKey {
  return v === 'beginner' || v === 'expert'
}
function isValidTheme(v: unknown): v is ThemeKey {
  return v === 'light' || v === 'dark'
}

export const useAppStore = create<AppState>((set) => ({
  mode: 'beginner',
  theme: 'light',
  setMode: (m) => {
    if (typeof window !== 'undefined') localStorage.setItem(MODE_KEY, m)
    set({ mode: m })
  },
  setTheme: (t) => {
    if (typeof window !== 'undefined') localStorage.setItem(THEME_KEY, t)
    set({ theme: t })
  },
  hydrate: () => {
    if (typeof window === 'undefined') return
    const savedMode = localStorage.getItem(MODE_KEY)
    const savedTheme = localStorage.getItem(THEME_KEY)
    const mode = isValidMode(savedMode) ? savedMode : 'beginner'
    const theme = isValidTheme(savedTheme) ? savedTheme : 'light'
    set({ mode, theme })
  }
}))
