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
    <aside className="w-full md:w-72 border-r border-border-light dark:border-border-dark">
      <div className="flex flex-col">
        {grouped.map(({ category, items }) => {
          const meta = CATEGORY_META[category]
          const isCollapsed = collapsed[category] ?? false
          return (
            <section key={category} className="border-b border-border-light dark:border-border-dark">
              <button
                type="button"
                onClick={() => setCollapsed({ ...collapsed, [category]: !isCollapsed })}
                className="w-full text-left px-4 py-2 flex items-center justify-between bg-bg-secondary-light dark:bg-bg-secondary-dark"
              >
                <span className="text-xs font-bold">
                  {meta.icon} {meta.label} ({items.length})
                </span>
                <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark md:hidden">
                  {isCollapsed ? '▾' : '▴'}
                </span>
              </button>
              {!isCollapsed && (
                <ul>
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
