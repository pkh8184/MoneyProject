// src/lib/stockMomentum/index.ts
import type { DetectContext, Signal, MomentumAnalysis, SignalCategory } from './types'
import {
  detectShortTermTrendChange,
  detectVolumeAnomaly,
  detectRsiRebound,
  detectNewHighBreak,
  detectBbLowerBounce,
  detectSupplyStrong,
  detectMacroBenefit,
  detectMlBullish,
  detectHistoricalWinner,
  detectBowlPhase3,
  detectOverheatedWarning,
  detectDownTrendWarning
} from './detectors'

export * from './types'

const DETECTORS = [
  detectShortTermTrendChange,
  detectVolumeAnomaly,
  detectRsiRebound,
  detectNewHighBreak,
  detectBbLowerBounce,
  detectSupplyStrong,
  detectMacroBenefit,
  detectMlBullish,
  detectHistoricalWinner,
  detectBowlPhase3,
  detectOverheatedWarning,
  detectDownTrendWarning
]

const CATEGORY_ORDER: SignalCategory[] = [
  'chart', 'supply', 'macro', 'ml', 'historical', 'bowl', 'warning'
]

export function analyzeMomentum(ctx: DetectContext): MomentumAnalysis {
  const signals: Signal[] = []
  for (const fn of DETECTORS) {
    try {
      const s = fn(ctx)
      if (s) signals.push(s)
    } catch {
      // detector 개별 에러는 스킵
    }
  }

  // 카테고리 순서 + 카테고리 내 강도 내림차순 정렬
  signals.sort((a, b) => {
    const catDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
    if (catDiff !== 0) return catDiff
    return b.strength - a.strength
  })

  const bullishCount = signals.filter((s) => s.tone === 'bullish').length
  const warningCount = signals.filter((s) => s.tone === 'warning').length
  return { signals, bullishCount, warningCount }
}
