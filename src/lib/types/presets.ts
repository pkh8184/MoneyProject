export type ModeKey = 'beginner' | 'expert'

export type PresetCategory =
  | 'trend_ma'
  | 'pattern'
  | 'volume_flow'
  | 'indicator'
  | 'value'
  | 'combo'

export interface ParamDef {
  key: string
  label: string
  type: 'slider' | 'toggle'
  min?: number
  max?: number
  step?: number
  default: number | boolean
}

export interface PresetDescription {
  beginner: string
  expert: string
}

export interface PresetFormula {
  summary: string            // 한 줄 요약
  baseConditions: string[]   // 필수 조건 (순서대로)
  bonusConditions?: string[] // 가산 조건 (선택)
  reference?: string         // 출처·참고
}

export interface PresetMeta {
  id: string
  name: string
  mode: ModeKey[]
  category: PresetCategory           // NEW REQUIRED
  shortFormula: string               // NEW REQUIRED
  params: ParamDef[]
  description: PresetDescription
  buyTiming: string
  holdingPeriod: string
  stopLoss: string
  traps: string
  beta?: boolean             // Beta 표시
  formula?: PresetFormula    // 정보 버튼에서 보여줄 공식
}
