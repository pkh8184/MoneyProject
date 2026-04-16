'use client'

interface Props {
  sector: string
  pct: number
  maxAbsPct: number
  positive: boolean
  onClick: () => void
  active: boolean
}

export default function SectorBar({ sector, pct, maxAbsPct, positive, onClick, active }: Props) {
  const widthPct = maxAbsPct > 0 ? Math.min(100, (Math.abs(pct) / maxAbsPct) * 100) : 0
  const colorClass = positive ? 'bg-emerald-500' : 'bg-red-500'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl ${
        active ? 'ring-2 ring-accent-light dark:ring-accent-dark' : ''
      } bg-bg-secondary-light dark:bg-bg-secondary-dark`}
    >
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="font-bold">{sector}</span>
        <span className={positive ? 'text-emerald-600' : 'text-red-600'}>
          {positive ? '🟢' : '🔴'} {positive ? '+' : ''}{pct.toFixed(2)}%
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
        <div className={`h-full ${colorClass}`} style={{ width: `${widthPct}%` }} />
      </div>
    </button>
  )
}
