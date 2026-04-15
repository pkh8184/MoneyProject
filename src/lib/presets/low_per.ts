import { latest, prev, allValid } from './utils'
import type { Preset } from './types'

export const lowPer: Preset = {
  id: 'low_per',
  name: '저PER 성장주',
  mode: ['expert'],
  category: 'value',
  shortFormula: 'PER < 15 AND PER > 0 AND MA60 상승',
  params: [
    { key: 'K', label: 'PER 기준', type: 'slider', min: 5, max: 25, step: 1, default: 15 }
  ],
  description: {
    beginner: '이익 대비 저평가된 상승 추세 종목',
    expert: 'PER이 기준 이하이면서 60일선이 상승 중'
  },
  buyTiming: '기술적 신호와 결합 시',
  holdingPeriod: '중장기',
  stopLoss: 'MA60 하향 이탈',
  traps: '구조적 저 PER 기업은 성장성 부족 가능',
  formula: {
    summary: '이익 기반 저평가 + 중기 상승 추세 확인',
    baseConditions: [
      'PER이 기준값(K) 미만',
      'PER > 0 (적자 기업 제외)',
      '오늘 MA60 > 20일 전 MA60 (중기 상승 추세)'
    ]
  },
  filter: ({ stock, fundamental, params }) => {
    if (!fundamental || fundamental.per == null || fundamental.per <= 0) return false
    const K = Number(params.K ?? 15)
    if (fundamental.per >= K) return false
    const m60 = latest(stock.ma60)
    const m60_20 = prev(stock.ma60, 20)
    if (!allValid(m60, m60_20)) return false
    return m60! > m60_20!
  },
  sortScore: ({ fundamental }) => -(fundamental?.per ?? 999)
}
