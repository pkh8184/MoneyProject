'use client'
import { strings } from '@/lib/strings/ko'
import type { MacroBonus } from '@/lib/macro/types'

interface Props {
  bonus: MacroBonus
  showZero?: boolean
}

export default function MacroBadge({ bonus, showZero = false }: Props) {
  if (bonus.total === 0 && !showZero) return null

  const color =
    bonus.total > 0
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
      : bonus.total < 0
      ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
      : 'bg-bg-secondary-light dark:bg-bg-secondary-dark text-text-secondary-light dark:text-text-secondary-dark'

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${color}`}>
      {strings.macro.badgeLabel(bonus.total)}
    </span>
  )
}
