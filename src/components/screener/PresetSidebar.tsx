'use client'

import { useState } from 'react'
import type { Preset } from '@/lib/presets/types'
import { groupByCategory, CATEGORY_META } from '@/lib/presets/categories'
import PresetItemRow from './PresetItemRow'

interface Props {
  presets: Preset[]
  activeId: string | null
  onSelect: (id: string) => void
}

export default function PresetSidebar({ presets, activeId, onSelect }: Props) {
  const grouped = groupByCategory(presets)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  return (
    <aside className="w-full md:w-72">
      <div className="flex flex-col gap-4">
        {grouped.map(({ category, items }) => {
          const meta = CATEGORY_META[category]
          const isCollapsed = collapsed[category] ?? false
          return (
            <section key={category}>
              <button
                type="button"
                onClick={() => setCollapsed({ ...collapsed, [category]: !isCollapsed })}
                className="w-full text-left px-2 py-2 flex items-center justify-between"
              >
                <span className="text-sm font-bold text-text-secondary-light dark:text-text-secondary-dark">
                  {meta.icon} {meta.label}
                  <span className="ml-1 text-text-secondary-light dark:text-text-secondary-dark opacity-60">({items.length})</span>
                </span>
                <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark md:hidden">
                  {isCollapsed ? '▾' : '▴'}
                </span>
              </button>
              {!isCollapsed && (
                <ul className="space-y-1">
                  {items.map((p) => (
                    <PresetItemRow
                      key={p.id}
                      preset={p}
                      active={activeId === p.id}
                      onSelect={onSelect}
                    />
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </aside>
  )
}
