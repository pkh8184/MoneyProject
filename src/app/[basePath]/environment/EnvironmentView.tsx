'use client'
import { useEffect, useState } from 'react'
import { useMacroFactors } from '@/lib/macro/useMacroFactors'
import { useFirstVisit } from '@/lib/storage/useFirstVisit'
import FirstVisitGuide from '@/components/common/FirstVisitGuide'
import FactorCard from './FactorCard'
import { strings } from '@/lib/strings/ko'
import type { FactorCategory, MacroFactor } from '@/lib/macro/types'

const CATEGORY_ORDER: FactorCategory[] = [
  'geopolitics',
  'rates',
  'commodity',
  'domestic',
  'theme',
  'sentiment'
]

export default function EnvironmentView() {
  const { all, activeIds, toggle, clearAll, isActive } = useMacroFactors()
  const [firstVisit, markVisited] = useFirstVisit('environment')
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    if (firstVisit) setShowGuide(true)
  }, [firstVisit])

  function factorsByCategory(cat: FactorCategory): MacroFactor[] {
    return all.filter((f) => f.category === cat)
  }

  return (
    <>
      <h1 className="text-xl font-bold mb-2">{strings.environment.pageTitle}</h1>
      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">
        {strings.environment.subtitle}
      </p>

      <div className="mb-6 p-4 rounded-2xl bg-bg-secondary-light dark:bg-bg-secondary-dark flex items-center justify-between flex-wrap gap-2">
        <span className="font-bold">
          {strings.environment.activeCount(activeIds.length, all.length)}
        </span>
        <button
          type="button"
          onClick={clearAll}
          className="px-3 py-1 rounded-full bg-bg-primary-light dark:bg-bg-primary-dark text-sm"
        >
          {strings.environment.clearAll}
        </button>
      </div>

      {CATEGORY_ORDER.map((cat) => {
        const list = factorsByCategory(cat)
        const activeN = list.filter((f) => isActive(f.id)).length
        return (
          <section key={cat} className="mb-8">
            <h2 className="font-bold mb-3 text-lg">
              {strings.environment.categoryTitle[cat]}{' '}
              <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                {strings.environment.categoryCount(activeN, list.length)}
              </span>
            </h2>
            <div className="space-y-2">
              {list.map((f) => (
                <FactorCard
                  key={f.id}
                  factor={f}
                  active={isActive(f.id)}
                  onToggle={() => toggle(f.id)}
                />
              ))}
            </div>
          </section>
        )
      })}

      {showGuide && (
        <FirstVisitGuide
          steps={[
            {
              title: strings.environment.guideStep1Title,
              body: strings.environment.guideStep1Body
            },
            {
              title: strings.environment.guideStep2Title,
              body: strings.environment.guideStep2Body
            },
            {
              title: strings.environment.guideStep3Title,
              body: strings.environment.guideStep3Body
            }
          ]}
          onDismiss={(persist) => {
            setShowGuide(false)
            if (persist) markVisited()
          }}
        />
      )}
    </>
  )
}
