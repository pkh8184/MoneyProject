import { latest, allValid } from './utils'
import type { Preset } from './types'

export const prevHighBreak: Preset = {
  id: 'prev_high_break',
  name: '전고점 돌파',
  mode: ['expert'],
  category: 'pattern',
  shortFormula: '최근 30일 최고가 돌파 + 거래량 1.2배↑',
  params: [],
  description: {
    beginner: '최근 한 달 최고가를 오늘 처음 깬 종목',
    expert: '최근 30거래일 내 최고 종가 신규 돌파 + 거래량 동반'
  },
  buyTiming: '돌파 당일 종가 또는 다음 날',
  holdingPeriod: '수일~1개월',
  stopLoss: '돌파 당일 저가 이탈',
  traps: '돌파 실패 시 가짜 신호 (whipsaw)',
  formula: {
    summary: '최근 30일 박스권 상단을 처음 돌파하는 종목',
    baseConditions: [
      '오늘 종가 > 최근 30일(어제까지) 최고 종가',
      '오늘 거래량 ≥ 20일 평균 거래량 × 1.2'
    ]
  },
  filter: ({ stock }) => {
    const c = latest(stock.close)
    const v = latest(stock.volume)
    const va = stock.vol_avg20
    if (!allValid(c, v, va)) return false
    const past30 = stock.close.slice(-31, -1).filter((x): x is number => x != null)
    if (past30.length < 30) return false
    const maxPast = Math.max(...past30)
    if (c! <= maxPast) return false
    return v! >= va! * 1.2
  },
  sortScore: ({ stock }) => {
    const c = latest(stock.close) ?? 0
    const past30 = stock.close.slice(-31, -1).filter((x): x is number => x != null)
    if (past30.length === 0) return 0
    const maxPast = Math.max(...past30)
    return maxPast > 0 ? ((c - maxPast) / maxPast) * 100 : 0
  }
}
