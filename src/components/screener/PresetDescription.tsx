import type { Preset } from '@/lib/presets/types'
import PresetInfoButton from './PresetInfoButton'

export default function PresetDescription({ preset }: { preset: Preset }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-xl font-bold">{preset.name}</h3>
        <PresetInfoButton preset={preset} />
      </div>
      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark leading-relaxed">
        {preset.description.expert}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <span><span className="text-text-secondary-light dark:text-text-secondary-dark">매수:</span> {preset.buyTiming}</span>
        <span className="text-text-secondary-light dark:text-text-secondary-dark">·</span>
        <span><span className="text-text-secondary-light dark:text-text-secondary-dark">보유:</span> {preset.holdingPeriod}</span>
        <span className="text-text-secondary-light dark:text-text-secondary-dark">·</span>
        <span><span className="text-text-secondary-light dark:text-text-secondary-dark">손절:</span> {preset.stopLoss}</span>
      </div>
    </div>
  )
}
