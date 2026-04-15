import { goldenCross } from './golden_cross'
import { alignment } from './alignment'
import { ma60TurnUp } from './ma60_turn_up'
import { high52w } from './high_52w'
import { volumeSpike } from './volume_spike'
import { foreignInstBuy } from './foreign_inst_buy'
import { rsiRebound } from './rsi_rebound'
import { macdCross } from './macd_cross'
import { bbLowerBounce } from './bb_lower_bounce'
import { lowPbr } from './low_pbr'
import { comboGolden } from './combo_golden'
import { comboValueRebound } from './combo_value_rebound'
import { bowlPattern } from './bowl_pattern'
import { pullbackBuy } from './pullback_buy'
import { prevHighBreak } from './prev_high_break'
import { vShapeRebound } from './v_shape_rebound'
import { tradingValueSpike } from './trading_value_spike'
import { macdHistPositive } from './macd_hist_positive'
import { lowPer } from './low_per'
import { safeLargeCap } from './safe_large_cap'
import type { Preset } from './types'

export const allPresets: Preset[] = [
  goldenCross, alignment, ma60TurnUp, high52w,
  volumeSpike, foreignInstBuy, rsiRebound, macdCross,
  bbLowerBounce, lowPbr, comboGolden, comboValueRebound,
  bowlPattern,
  pullbackBuy, prevHighBreak, vShapeRebound, tradingValueSpike,
  macdHistPositive, lowPer, safeLargeCap
]

export const presetMap: Record<string, Preset> = Object.fromEntries(
  allPresets.map((p) => [p.id, p])
)

export function getPresetById(id: string): Preset | undefined {
  return presetMap[id]
}

export function getExpertPresets(): Preset[] {
  return allPresets.filter((p) => p.mode.includes('expert'))
}

export function getBeginnerPresets(): Preset[] {
  return allPresets.filter((p) => p.mode.includes('beginner'))
}
