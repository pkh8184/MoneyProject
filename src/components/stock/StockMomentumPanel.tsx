'use client'
import { useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import { analyzeMomentum } from '@/lib/stockMomentum'
import type { DetectContext, Signal, SignalCategory } from '@/lib/stockMomentum/types'
import { strings } from '@/lib/strings/ko'

interface Props extends DetectContext {
  /** 모바일에서 기본 펼침 여부 */
  defaultOpen?: boolean
}

const CATEGORY_META: Record<SignalCategory, { emoji: string; label: string }> = {
  chart:      { emoji: '📈', label: '차트' },
  supply:     { emoji: '💰', label: '수급' },
  macro:      { emoji: '🌍', label: '매크로' },
  ml:         { emoji: '🤖', label: 'ML 예측' },
  historical: { emoji: '📊', label: '과거 유사' },
  bowl:       { emoji: '🍚', label: '밥그릇' },
  warning:    { emoji: '⚠️', label: '주의' }
}

function renderStars(n: 1 | 2 | 3): string {
  return '⭐'.repeat(n)
}

function timingLabel(t: Signal['timing']): string {
  if (t === 'latest') return strings.momentum.timingLatest
  if (t === 'recent') return strings.momentum.timingRecent
  return strings.momentum.timingOngoing
}

export default function StockMomentumPanel(props: Props) {
  const { defaultOpen = true, ...ctx } = props
  const analysis = useMemo(() => analyzeMomentum(ctx), [ctx])
  const [open, setOpen] = useState(defaultOpen)

  // 카테고리별 그룹핑
  const byCategory = useMemo(() => {
    const map = new Map<SignalCategory, Signal[]>()
    for (const s of analysis.signals) {
      const arr = map.get(s.category) ?? []
      arr.push(s)
      map.set(s.category, arr)
    }
    return map
  }, [analysis.signals])

  const header = (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-bold text-lg">{strings.momentum.panelTitle}</h3>
        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
          {strings.momentum.summary(analysis.bullishCount, analysis.warningCount)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-sm px-3 py-1 rounded-full bg-bg-secondary-light dark:bg-bg-secondary-dark"
        aria-label={open ? strings.momentum.collapseAria : strings.momentum.expandAria}
      >
        {open ? '▲' : '▼'}
      </button>
    </div>
  )

  if (analysis.signals.length === 0) {
    return (
      <Card padding="md" className="mt-4">
        {header}
        <p className="text-sm mt-3">{strings.momentum.emptyMessage}</p>
      </Card>
    )
  }

  if (!open) {
    return <Card padding="md" className="mt-4">{header}</Card>
  }

  return (
    <Card padding="md" className="mt-4">
      {header}
      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-2 mb-3">
        {strings.momentum.dataNote}
      </p>

      <div className="space-y-4">
        {Array.from(byCategory.entries()).map(([cat, sigs]) => {
          const meta = CATEGORY_META[cat]
          const isWarning = cat === 'warning'
          return (
            <section
              key={cat}
              className={`p-3 rounded-xl ${isWarning ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-bg-secondary-light dark:bg-bg-secondary-dark'}`}
            >
              <div className="text-sm font-bold mb-2">
                {meta.emoji} {meta.label} ({sigs.length}개)
              </div>
              <ul className="space-y-2">
                {sigs.map((s) => (
                  <li key={s.id} className="text-sm">
                    <div className="flex items-baseline justify-between gap-2">
                      <span>
                        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark mr-2">
                          {renderStars(s.strength)}
                        </span>
                        <span className="font-bold">{s.label}</span>
                        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark ml-2">
                          ({timingLabel(s.timing)})
                        </span>
                      </span>
                      {s.linkAnchor && (
                        <a
                          href={`#${s.linkAnchor}`}
                          className="text-xs underline text-text-secondary-light dark:text-text-secondary-dark"
                        >
                          {strings.momentum.moreLink}
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark ml-1">
                      {s.description}
                      {s.detail && ` · ${s.detail}`}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </Card>
  )
}
