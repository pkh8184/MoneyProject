import { latest, prev, allValid } from './utils'
import type { Preset } from './types'

export const macdHistPositive: Preset = {
  id: 'macd_hist_positive',
  name: 'MACD 히스토그램 양전환',
  mode: ['expert'],
  category: 'indicator',
  shortFormula: 'Histogram 음→양 전환',
  params: [],
  description: {
    beginner: '추세 전환 초기 신호가 발생한 종목',
    expert: 'MACD 히스토그램이 0선을 상향 돌파'
  },
  buyTiming: '양전환 당일 종가',
  holdingPeriod: '2주~1개월',
  stopLoss: '히스토그램 재음전환',
  traps: '횡보장에서 양·음 전환이 반복될 수 있음',
  formula: {
    summary: 'MACD Histogram이 음에서 양으로 처음 전환',
    baseConditions: [
      '오늘 MACD Histogram > 0',
      '어제 MACD Histogram ≤ 0'
    ]
  },
  filter: ({ stock }) => {
    const h = latest(stock.macd_hist)
    const hy = prev(stock.macd_hist, 1)
    if (!allValid(h, hy)) return false
    return h! > 0 && hy! <= 0
  }
}
