'use client'

import Card from '@/components/ui/Card'
import { strings } from '@/lib/strings/ko'
import type { StockIndicators } from '@/lib/types/indicators'
import { detectBowlPhase } from '@/lib/bowl/detectPhase'

interface Props {
  stock: StockIndicators
}

const PHASES: { num: 1 | 2 | 3 | 4; key: 'phase1' | 'phase2' | 'phase3' | 'phase4' }[] = [
  { num: 1, key: 'phase1' },
  { num: 2, key: 'phase2' },
  { num: 3, key: 'phase3' },
  { num: 4, key: 'phase4' }
]

export default function BowlPhaseIndicator({ stock }: Props) {
  if (!stock.has_224) return null

  const phase = detectBowlPhase(stock)
  const t = strings.bowlPhase

  return (
    <Card padding="lg" className="mt-6">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="font-bold text-xl">{t.title}</h3>
        <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
          {t.subtitle}
        </span>
      </div>

      {phase == null ? (
        <p className="mt-4 text-sm text-text-secondary-light dark:text-text-secondary-dark">
          {t.notDetected}
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {PHASES.map((p) => {
              const active = p.num === phase
              const passed = p.num < phase
              return (
                <div
                  key={p.num}
                  className={`p-3 rounded-xl text-center ${
                    active
                      ? 'bg-accent-light dark:bg-accent-dark text-white'
                      : passed
                      ? 'bg-bg-secondary-light dark:bg-bg-secondary-dark opacity-60'
                      : 'bg-bg-secondary-light dark:bg-bg-secondary-dark opacity-40'
                  }`}
                >
                  <div className="text-sm font-bold">{t[p.key].short}</div>
                  {active && (
                    <div className="text-xs mt-1">{t.currentLabel}</div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-bg-secondary-light dark:bg-bg-secondary-dark">
            <div className="font-bold text-sm mb-1">{t[PHASES[phase - 1].key].full}</div>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              {t[PHASES[phase - 1].key].desc}
            </p>
          </div>

          <p className="mt-3 text-xs text-text-secondary-light dark:text-text-secondary-dark">
            💡 {t.hint}
          </p>
        </>
      )}
    </Card>
  )
}
