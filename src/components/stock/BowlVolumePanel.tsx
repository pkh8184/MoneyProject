'use client'

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

  const row = (label: string, value: string, stars: string) => (
    <tr className="border-b border-border-light dark:border-border-dark" key={label}>
      <td className="py-1 pr-3 text-text-secondary-light dark:text-text-secondary-dark">{label}</td>
      <td className="py-1 pr-3 font-mono text-xs">{value}</td>
      <td className="py-1 text-right text-xs">{stars}</td>
    </tr>
  )

  const fmt = (n: number | null | undefined) => n == null ? '—' : n.toString()

  return (
    <section className="mt-6">
      <h3 className="font-bold mb-2">🍚 밥그릇 거래량 분석 (Beta)</h3>
      <table className="w-full text-sm">
        <tbody>
          {row('Dry-up 비율', fmt(stock.bowl_vol_dryup_ratio), starsFor('dryup', stock.bowl_vol_dryup_ratio))}
          {row('Explosion 비율', fmt(stock.bowl_vol_explosion_ratio), starsFor('explosion', stock.bowl_vol_explosion_ratio))}
          {row('거래대금 팽창', fmt(stock.bowl_value_expansion_ratio), starsFor('value_exp', stock.bowl_value_expansion_ratio))}
          {row('매집 봉 수', fmt(stock.bowl_accumulation_bars), starsFor('acc', stock.bowl_accumulation_bars))}
          {row('거래량 기울기', fmt(stock.bowl_volume_slope), starsFor('slope', stock.bowl_volume_slope))}
          {row('외국인 매집 비율', foreignRatio == null ? '—' : foreignRatio.toFixed(2), starsFor('foreign', foreignRatio))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="font-bold">종합 점수: {totalScore} / 100</span>
        <span>{gradeLabel(totalScore)}</span>
      </div>
      <p className="mt-2 text-[10px] text-text-secondary-light dark:text-text-secondary-dark">
        Beta. 참고용. 미래 수익 보장 아님.
      </p>
    </section>
  )
}
