import { latest, prev, allValid } from './utils'
import type { Preset } from './types'

export const tradingValueSpike: Preset = {
  id: 'trading_value_spike',
  name: '거래대금 급증',
  mode: ['expert'],
  category: 'volume_flow',
  shortFormula: '거래대금 ≥ 100억원 AND 전일 대비 2배↑',
  params: [],
  description: {
    beginner: '하루 거래되는 돈이 급격히 많아진 종목',
    expert: '종가 × 거래량 ≥ 100억 + 전일 거래대금의 2배 이상'
  },
  buyTiming: '급증일 종가 또는 다음 날 시초가',
  holdingPeriod: '수일~2주',
  stopLoss: '급증일 저가 이탈',
  traps: '대규모 매도 물량이 섞인 경우도 거래대금 급증으로 잡힘',
  formula: {
    summary: '자금 유입 규모 기반 모멘텀 감지',
    baseConditions: [
      '오늘 거래대금 = 오늘 종가 × 오늘 거래량 ≥ 100억원',
      '오늘 거래대금 ≥ 어제 거래대금 × 2',
      '현재가가 어제 종가보다 높음 (양봉)'
    ]
  },
  filter: ({ stock }) => {
    const c = latest(stock.close)
    const v = latest(stock.volume)
    const cy = prev(stock.close, 1)
    const vy = prev(stock.volume, 1)
    if (!allValid(c, v, cy, vy)) return false
    const today = c! * v!
    const yesterday = cy! * vy!
    if (today < 10_000_000_000) return false // 100억
    if (yesterday > 0 && today < yesterday * 2) return false
    return c! > cy!
  },
  sortScore: ({ stock }) => {
    const c = latest(stock.close) ?? 0
    const v = latest(stock.volume) ?? 0
    return c * v
  }
}
