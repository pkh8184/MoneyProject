'use client'

import { useAppStore } from '@/store/useAppStore'
import { strings } from '@/lib/strings/ko'

export default function ThemeToggle() {
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)

  return (
    <button
      type="button"
      role="switch"
      aria-checked={theme === 'dark'}
      aria-label={strings.theme.toggle_aria}
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-border-light dark:border-border-dark hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark"
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}
