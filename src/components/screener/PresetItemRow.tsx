'use client'

import type { Preset } from '@/lib/presets/types'
import PresetInfoButton from './PresetInfoButton'
import Pill from '@/components/ui/Pill'

interface Props {
  preset: Preset
  active: boolean
  onSelect: (id: string) => void
}

export default function PresetItemRow({ preset, active, onSelect }: Props) {
  const hasParams = preset.params.length > 0
  return (
    <li className="flex items-start gap-1 pr-2 group">
      <button
        type="button"
        onClick={() => onSelect(preset.id)}
        className={`relative flex-1 text-left px-5 py-3 rounded-xl hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark ${
          active ? 'bg-bg-secondary-light dark:bg-bg-secondary-dark' : ''
        }`}
      >
        {active && (
          <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-7 bg-accent-light dark:bg-accent-dark rounded-full" />
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-base ${active ? 'font-bold text-accent-light dark:text-accent-dark' : ''}`}>
            {preset.name}
          </span>
          {preset.beta && <Pill>BETA</Pill>}
          {hasParams && <Pill>PARAM</Pill>}
        </div>
        <div className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
          {preset.shortFormula}
        </div>
      </button>
      <div className="pt-3 opacity-60 group-hover:opacity-100 transition-opacity">
        <PresetInfoButton preset={preset} />
      </div>
    </li>
  )
}
