'use client'

import type { ParamDef } from '@/lib/types/presets'
import type { PresetParams } from '@/lib/presets/types'

interface Props {
  params: ParamDef[]
  values: PresetParams
  onChange: (next: PresetParams) => void
}

export default function ParamControls({ params, values, onChange }: Props) {
  if (params.length === 0) return null
  return (
    <div className="space-y-3 p-4 bg-bg-secondary-light dark:bg-bg-secondary-dark rounded">
      {params.map((p) => {
        const v = values[p.key] ?? p.default
        if (p.type === 'slider') {
          return (
            <label key={p.key} className="block">
              <span className="text-xs">{p.label}: {v}</span>
              <input
                type="range"
                min={p.min}
                max={p.max}
                step={p.step}
                value={typeof v === 'boolean' ? 0 : v}
                onChange={(e) => onChange({ ...values, [p.key]: Number(e.target.value) })}
                className="w-full"
              />
            </label>
          )
        }
        return (
          <label key={p.key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(v)}
              onChange={(e) => onChange({ ...values, [p.key]: e.target.checked })}
            />
            {p.label}
          </label>
        )
      })}
    </div>
  )
}
