export type FactorCategory =
  | 'geopolitics'
  | 'rates'
  | 'commodity'
  | 'domestic'
  | 'theme'
  | 'sentiment'

export type FactorLevel = 'danger' | 'caution' | 'opportunity'

export interface FactorMatch {
  themes?: string[]
  nameKeywords?: string[]
}

export interface MacroFactor {
  id: string
  category: FactorCategory
  level: FactorLevel
  emoji: string
  name: string
  desc: string
  beneficiaries: FactorMatch
  losers: FactorMatch
  defaultActive: boolean
  weight: number
}

export interface MacroBonusDetail {
  factorId: string
  factorName: string
  delta: number
  role: 'benefit' | 'loss'
}

export interface MacroBonus {
  total: number
  detail: MacroBonusDetail[]
}
