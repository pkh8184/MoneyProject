// src/lib/stockMomentum/types.ts
import type { StockIndicators, Fundamental, PresetPatternStats, MLPrediction } from '@/lib/types/indicators'
import type { MacroBonus } from '@/lib/macro/types'
import type { SectorRotationBonus } from '@/lib/macro/sectorRotation'
import type { SingleStockOhlcv } from '@/lib/dataLoader'

export type SignalCategory =
  | 'chart' | 'supply' | 'macro' | 'ml' | 'historical' | 'bowl' | 'warning'

export type SignalTone = 'bullish' | 'warning'

/** 신호 발생 시점 */
export type SignalTiming = 'latest' | 'recent' | 'ongoing'

export interface Signal {
  id: string
  category: SignalCategory
  tone: SignalTone
  strength: 1 | 2 | 3
  timing: SignalTiming
  label: string
  description: string
  detail?: string
  linkAnchor?: string
}

export interface MomentumAnalysis {
  signals: Signal[]
  bullishCount: number
  warningCount: number
}

export interface DetectContext {
  stock: StockIndicators
  ohlcvFull?: SingleStockOhlcv
  fundamental?: Fundamental
  macroBonus?: MacroBonus
  sectorRotation?: SectorRotationBonus
  mlPrediction?: MLPrediction
  patternStats?: { [presetId: string]: PresetPatternStats }
  matchedPresetIds?: string[]
}

export const PANEL_ANCHORS = {
  matchedPresets:  'matched-presets',
  bowlPhase:       'bowl-phase',
  bowlVolume:      'bowl-volume',
  macroDetail:     'macro-detail',
  mlPrediction:    'ml-prediction'
} as const
