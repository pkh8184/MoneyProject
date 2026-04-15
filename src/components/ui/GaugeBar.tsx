interface GaugeBarProps {
  value: number       // 0~100
  max?: number
  colorClass?: string  // e.g., 'bg-accent-light'
  height?: string      // tailwind class
  showLabel?: boolean
}

export default function GaugeBar({
  value,
  max = 100,
  colorClass = 'bg-accent-light dark:bg-accent-dark',
  height = 'h-2',
  showLabel = false
}: GaugeBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="w-full">
      <div className={`w-full ${height} bg-bg-primary-light dark:bg-bg-primary-dark rounded-full overflow-hidden`}>
        <div
          className={`${height} ${colorClass} rounded-full transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-sm text-text-secondary-light dark:text-text-secondary-dark text-right">
          {Math.round(pct)}%
        </div>
      )}
    </div>
  )
}
