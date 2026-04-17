// src/lib/bowl/detectPhase.ts
import type { StockIndicators } from '@/lib/types/indicators'

export type BowlPhase = 1 | 2 | 3 | 4 | null

/**
 * 밥그릇 4단계 중 현재 위치 판정.
 * BowlPhaseIndicator와 StockMomentumPanel에서 공유.
 */
export function detectBowlPhase(stock: StockIndicators): BowlPhase {
  if (stock.bowl_low_90d == null || stock.bowl_days_since_low == null) return null
  if (stock.bowl_low_was_inverted !== true) return null

  if (stock.bowl_current_aligned === true && stock.bowl_has_recent_golden_cross === true) {
    return 4
  }
  if (stock.bowl_has_recent_golden_cross === true) {
    return 3
  }
  if (stock.bowl_days_since_low >= 10) {
    return 2
  }
  return 1
}
