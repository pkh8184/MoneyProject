'use client'
import { strings } from '@/lib/strings/ko'
import type { MacroFactor } from '@/lib/macro/types'

interface Props {
  factor: MacroFactor
  active: boolean
  autoDetected?: boolean
  onToggle: () => void
}

function formatMatch(m: { themes?: string[]; nameKeywords?: string[] }): string {
  const parts: string[] = []
  if (m.themes && m.themes.length > 0) parts.push(...m.themes)
  if (m.nameKeywords && m.nameKeywords.length > 0) parts.push(...m.nameKeywords)
  return parts.join(', ')
}

export default function FactorCard({ factor, active, autoDetected, onToggle }: Props) {
  const benefits = formatMatch(factor.beneficiaries)
  const losers = formatMatch(factor.losers)

  return (
    <label
      className={`block p-4 rounded-2xl cursor-pointer ${
        active
          ? 'bg-accent-light/10 dark:bg-accent-dark/20 ring-2 ring-accent-light dark:ring-accent-dark'
          : 'bg-bg-secondary-light dark:bg-bg-secondary-dark'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={active}
          onChange={onToggle}
          className="mt-1"
        />
        <div className="flex-1">
          <div className="font-bold mb-1 flex items-center gap-2 flex-wrap">
            <span>{factor.emoji} {factor.name}</span>
            {autoDetected && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                active
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                  : 'bg-bg-primary-light dark:bg-bg-primary-dark text-text-secondary-light dark:text-text-secondary-dark'
              }`}>
                {strings.autoDetect.badgeLabel}
              </span>
            )}
            <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark ml-auto">
              {strings.macro.weightLabel(factor.weight)}
            </span>
          </div>
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-2">
            {factor.desc}
          </p>
          {benefits && (
            <p className="text-sm">
              <span className="text-emerald-600">{strings.environment.beneficiaryLabel}</span>:{' '}
              {benefits}
            </p>
          )}
          {losers && (
            <p className="text-sm">
              <span className="text-red-600">{strings.environment.loserLabel}</span>:{' '}
              {losers}
            </p>
          )}
        </div>
      </div>
    </label>
  )
}
