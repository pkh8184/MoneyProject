'use client'
import { strings } from '@/lib/strings/ko'
import type { MacroFactor } from '@/lib/macro/types'

interface Props {
  factor: MacroFactor
  active: boolean
  onToggle: () => void
}

function formatMatch(m: { themes?: string[]; nameKeywords?: string[] }): string {
  const parts: string[] = []
  if (m.themes && m.themes.length > 0) parts.push(...m.themes)
  if (m.nameKeywords && m.nameKeywords.length > 0) parts.push(...m.nameKeywords)
  return parts.join(', ')
}

export default function FactorCard({ factor, active, onToggle }: Props) {
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
          <div className="font-bold mb-1">
            {factor.emoji} {factor.name}
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
