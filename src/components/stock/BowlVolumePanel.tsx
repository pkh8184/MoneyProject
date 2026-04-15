'use client'

import Card from '@/components/ui/Card'
import GaugeBar from '@/components/ui/GaugeBar'
import type { StockIndicators, Fundamental } from '@/lib/types/indicators'

interface Props {
  stock: StockIndicators
  fundamental?: Fundamental
}

function starsFor(metric: string, value: number | null | undefined): string {
  if (value == null) return '—'
  switch (metric) {
    case 'dryup':
      if (value < 0.6) return '⭐⭐⭐'
      if (value < 0.8) return '⭐⭐'
      if (value < 1.0) return '⭐'
      return '·'
    case 'explosion':
      if (value >= 2.0) return '⭐⭐⭐'
      if (value >= 1.5) return '⭐⭐'
      if (value >= 1.3) return '⭐'
      return '·'
    case 'value_exp':
      if (value >= 2.0) return '⭐⭐⭐'
      if (value >= 1.5) return '⭐⭐'
      return '·'
    case 'acc':
      if (value >= 3) return '⭐⭐⭐'
      if (value === 2) return '⭐⭐'
      if (value === 1) return '⭐'
      return '·'
    case 'slope':
      if (value > 0.015) return '⭐⭐⭐'
      if (value > 0.005) return '⭐⭐'
      return '·'
    case 'foreign':
      if (value >= 0.6) return '⭐⭐⭐'
      if (value >= 0.4) return '⭐⭐'
      return '·'
    default:
      return '—'
  }
}

function gradeLabel(score: number): string {
  if (score >= 80) return '🟢 강한 밥그릇'
  if (score >= 60) return '🟡 유효 밥그릇'
  if (score >= 40) return '🟠 약한 밥그릇'
  return '🔴 밥그릇 아님'
}

export default function BowlVolumePanel({ stock, fundamental }: Props) {
  if (!stock.has_224) return null
  if (stock.bowl_low_90d == null) return null

  const baseScore = stock.bowl_volume_score ?? 0
  let foreignRatio: number | null = null
  let foreignBonus = 0
  if (fundamental?.foreign_net && fundamental.foreign_net.length >= 10) {
    const positive = fundamental.foreign_net.filter((v) => v > 0).length
    foreignRatio = positive / fundamental.foreign_net.length
    if (foreignRatio >= 0.6) foreignBonus = 5
    else if (foreignRatio >= 0.4) foreignBonus = 3
  }
  const totalScore = Math.min(100, baseScore + foreignBonus)

  const rows: Array<{ label: string; value: number | null | undefined; metric: string }> = [
    { label: 'Dry-up 비율', value: stock.bowl_vol_dryup_ratio, metric: 'dryup' },
    { label: 'Explosion 비율', value: stock.bowl_vol_explosion_ratio, metric: 'explosion' },
    { label: '거래대금 팽창', value: stock.bowl_value_expansion_ratio, metric: 'value_exp' },
    { label: '매집 봉 수', value: stock.bowl_accumulation_bars, metric: 'acc' },
    { label: '거래량 기울기', value: stock.bowl_volume_slope, metric: 'slope' },
    { label: '외국인 매집', value: foreignRatio, metric: 'foreign' }
  ]

  return (
    <Card padding="lg" className="mt-6">
      <h3 className="font-bold text-xl mb-4">🍚 밥그릇 거래량 분석 (Beta)</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {rows.map((r) => (
          <Card key={r.label} padding="sm" className="!p-4">
            <div className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{r.label}</div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-mono text-base font-bold">
                {r.value == null ? '—' : r.value.toString()}
              </span>
              <span className="text-sm">{starsFor(r.metric, r.value)}</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-base font-bold">종합 점수</span>
          <span className="text-base">{totalScore} / 100 · {gradeLabel(totalScore)}</span>
        </div>
        <GaugeBar value={totalScore} max={100} />
      </div>

      <p className="mt-4 text-sm text-text-secondary-light dark:text-text-secondary-dark">
        Beta. 참고용. 미래 수익 보장 아님.
      </p>
    </Card>
  )
}
