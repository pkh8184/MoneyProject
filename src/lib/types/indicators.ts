export interface StockMeta {
  code: string
  name: string
  market: 'KOSPI' | 'KOSDAQ' | 'UNKNOWN'
}

export interface StocksJson {
  updated_at: string
  trade_date: string
  count: number
  stocks: StockMeta[]
}

export interface StockIndicators {
  name: string
  market: 'KOSPI' | 'KOSDAQ' | 'UNKNOWN'
  dates: string[]
  open?: number[]
  high?: number[]
  low?: number[]
  close: number[]
  volume: number[]
  ma5: (number | null)[]
  ma20: (number | null)[]
  ma60: (number | null)[]
  ma120: (number | null)[]
  rsi14: (number | null)[]
  macd_line: (number | null)[]
  macd_signal: (number | null)[]
  macd_hist: (number | null)[]
  bb_upper: (number | null)[]
  bb_middle: (number | null)[]
  bb_lower: (number | null)[]
  high52w: number | null
  has_52w: boolean
  vol_avg20: number | null
}

export interface IndicatorsJson {
  meta: {
    updated_at: string
    trade_date: string
    stock_count: number
    days: number
  }
  [code: string]: StockIndicators | IndicatorsJson['meta']
}

export interface Fundamental {
  pbr: number | null
  per: number | null
  market_cap: number
  foreign_net: number[]
  institution_net: number[]
}

export interface FundamentalsJson {
  [code: string]: Fundamental
}

export interface UpdatedAtJson {
  updated_at: string
  trade_date: string
}

export interface SectorInfo {
  sector: string
  industry: string
  themes: string[]
}

export interface SectorsJson {
  [code: string]: SectorInfo
}

export interface ReturnStat {
  avg: number
  max: number
  win_rate: number
}

export interface PresetPatternStats {
  sample_count: number
  d1: ReturnStat
  d3: ReturnStat
  d7: ReturnStat
}

export interface PatternStatsJson {
  meta: { updated_at: string; lookback_days: number }
  by_stock_preset: {
    [code: string]: { [presetId: string]: PresetPatternStats }
  }
}
