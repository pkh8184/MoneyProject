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
    <div className="space-y-4 mt-4">
      {params.map((p) => {
        const v = values[p.key] ?? p.default
        if (p.type === 'slider') {
          return (
            <label key={p.key} className="block">
              <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                {p.label}: <span className="font-bold text-text-primary-light dark:text-text-primary-dark">{String(v)}</span>
              </span>
              <input
                type="range"
                min={p.min}
                max={p.max}
                step={p.step}
                value={typeof v === 'boolean' ? 0 : v}
                onChange={(e) => onChange({ ...values, [p.key]: Number(e.target.value) })}
                className="w-full mt-2 accent-accent-light dark:accent-accent-dark"
              />
            </label>
          )
        }
        return (
          <label key={p.key} className="flex items-center gap-3 text-base cursor-pointer py-2">
            <input
              type="checkbox"
              checked={Boolean(v)}
              onChange={(e) => onChange({ ...values, [p.key]: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <span>{p.label}</span>
          </label>
        )
      })}
    </div>
  )
}
