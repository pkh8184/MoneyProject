'use client'

import type { Preset } from '@/lib/presets/types'
import PresetInfoButton from './PresetInfoButton'

interface Props {
  presets: Preset[]
  activeId: string | null
  onSelect: (id: string) => void
}

export default function PresetSidebar({ presets, activeId, onSelect }: Props) {
  return (
    <aside className="w-full md:w-60 border-r border-border-light dark:border-border-dark">
      <ul className="flex md:flex-col overflow-x-auto md:overflow-visible">
        {presets.map((p) => (
          <li key={p.id} className="flex items-center gap-1 pr-2">
            <button
              type="button"
              onClick={() => onSelect(p.id)}
              className={`flex-1 text-left px-4 py-2 text-sm hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark ${
                activeId === p.id ? 'bg-bg-secondary-light dark:bg-bg-secondary-dark font-bold' : ''
              }`}
            >
              {p.name}
            </button>
            <PresetInfoButton preset={p} />
          </li>
        ))}
      </ul>
    </aside>
  )
}
