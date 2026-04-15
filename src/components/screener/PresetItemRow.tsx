'use client'

import type { Preset } from '@/lib/presets/types'
import PresetInfoButton from './PresetInfoButton'

interface Props {
  preset: Preset
  active: boolean
  onSelect: (id: string) => void
}

export default function PresetItemRow({ preset, active, onSelect }: Props) {
  const hasParams = preset.params.length > 0
  return (
    <li className="flex items-start gap-1 pr-2">
      <button
        type="button"
        onClick={() => onSelect(preset.id)}
        className={`flex-1 text-left px-4 py-2 text-sm hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark ${
          active ? 'bg-bg-secondary-light dark:bg-bg-secondary-dark' : ''
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className={active ? 'font-bold' : ''}>
            {active ? '● ' : '○ '}{preset.name}
          </span>
          {preset.beta && (
            <span className="text-[10px] px-1.5 py-0.5 bg-accent-light dark:bg-accent-dark text-white rounded">
              BETA
            </span>
          )}
          {hasParams && (
            <span className="text-[10px] px-1.5 py-0.5 border border-border-light dark:border-border-dark rounded">
              param
            </span>
          )}
        </div>
        <div className="text-[11px] text-text-secondary-light dark:text-text-secondary-dark mt-0.5">
          {preset.shortFormula}
        </div>
      </button>
      <div className="pt-3">
        <PresetInfoButton preset={preset} />
      </div>
    </li>
  )
}
