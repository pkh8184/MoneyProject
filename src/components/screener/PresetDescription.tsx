import type { Preset } from '@/lib/presets/types'

export default function PresetDescription({ preset }: { preset: Preset }) {
  return (
    <div className="text-xs space-y-1 mb-4">
      <p>{preset.description.expert}</p>
      <p><strong>매수 타이밍:</strong> {preset.buyTiming}</p>
      <p><strong>보유 기간:</strong> {preset.holdingPeriod}</p>
      <p><strong>손절 기준:</strong> {preset.stopLoss}</p>
      <p className="text-text-secondary-light dark:text-text-secondary-dark">
        <strong>주의:</strong> {preset.traps}
      </p>
    </div>
  )
}
