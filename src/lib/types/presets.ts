export type ModeKey = 'beginner' | 'expert'

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

export interface PresetMeta {
  id: string
  name: string
  mode: ModeKey[]
  params: ParamDef[]
  description: PresetDescription
  buyTiming: string
  holdingPeriod: string
  stopLoss: string
  traps: string
}
