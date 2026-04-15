'use client'

import { useAppStore } from '@/store/useAppStore'
import { strings } from '@/lib/strings/ko'

export default function ModeToggle() {
  const mode = useAppStore((s) => s.mode)
  const setMode = useAppStore((s) => s.setMode)

  return (
    <button
      type="button"
      role="switch"
      aria-checked={mode === 'expert'}
      aria-label={strings.mode.toggle_aria}
      onClick={() => setMode(mode === 'beginner' ? 'expert' : 'beginner')}
      className="inline-flex items-center gap-2 px-3 py-1 text-sm rounded-full border border-border-light dark:border-border-dark hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark"
    >
      <span className={mode === 'beginner' ? 'font-bold' : 'text-text-secondary-light dark:text-text-secondary-dark'}>
        {strings.mode.beginner}
      </span>
      <span aria-hidden className="text-text-secondary-light dark:text-text-secondary-dark">/</span>
      <span className={mode === 'expert' ? 'font-bold' : 'text-text-secondary-light dark:text-text-secondary-dark'}>
        {strings.mode.expert}
      </span>
    </button>
  )
}
