'use client'
import Card from '@/components/ui/Card'
import { strings } from '@/lib/strings/ko'
import type { MacroFactor } from '@/lib/macro/types'

interface Props {
  autoDetected: MacroFactor[]
  isActive: (id: string) => boolean
  onToggle: (id: string) => void
  onApplyAll: () => void
  updatedAt: string | null
}

export default function AutoDetectCard({ autoDetected, isActive, onToggle, onApplyAll, updatedAt }: Props) {
  if (autoDetected.length === 0) {
    return (
      <Card padding="md" className="mb-6">
        <p className="text-sm">{strings.autoDetect.noneDetected}</p>
      </Card>
    )
  }

  const allApplied = autoDetected.every((f) => isActive(f.id))

  return (
    <Card padding="md" className="mb-6 border-2 border-yellow-400 dark:border-yellow-600">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-bold">{strings.autoDetect.title(autoDetected.length)}</h3>
        {updatedAt && (
          <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
            {strings.autoDetect.updatedAt(updatedAt)}
          </span>
        )}
      </div>
      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-3">
        {strings.autoDetect.description}
      </p>
      <div className="space-y-2">
        {autoDetected.map((f) => {
          const active = isActive(f.id)
          return (
            <div
              key={f.id}
              className="flex items-center justify-between p-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark"
            >
              <span className="text-sm">
                {f.emoji} {f.name}{' '}
                <span className={active ? 'text-emerald-600' : 'text-text-secondary-light dark:text-text-secondary-dark'}>
                  {active ? strings.autoDetect.applied : strings.autoDetect.notApplied}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onToggle(f.id)}
                className="text-xs px-3 py-1 rounded-full bg-bg-primary-light dark:bg-bg-primary-dark"
              >
                {active ? strings.autoDetect.turnOff : strings.autoDetect.turnOn}
              </button>
            </div>
          )
        })}
      </div>
      {!allApplied && (
        <button
          type="button"
          onClick={onApplyAll}
          className="mt-4 w-full px-4 py-2 rounded-full bg-accent-light dark:bg-accent-dark text-white text-sm"
        >
          {strings.autoDetect.applyAll}
        </button>
      )}
    </Card>
  )
}
