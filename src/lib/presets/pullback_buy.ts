import { latest, allValid } from './utils'
import type { Preset } from './types'

export const pullbackBuy: Preset = {
  id: 'pullback_buy',
  name: '눌림목 매수',
  mode: ['expert'],
  category: 'trend_ma',
  shortFormula: '정배열 + 현재가 MA20 ±2% + RSI 30~50',
  params: [],
  description: {
    beginner: '상승 추세 중 일시 조정 후 반등 자리',
    expert: '정배열 유지 상태에서 가격이 MA20 근처까지 눌렸을 때'
  },
  buyTiming: 'MA20 터치 또는 근접 시 반등 확인 후',
  holdingPeriod: '2주~2개월',
  stopLoss: 'MA20 명확한 하향 이탈',
  traps: '하락 추세 전환일 경우 지지 실패',
  formula: {
    summary: '장기 상승 추세(정배열)에서 단기 조정 후 재매수 타이밍',
    baseConditions: [
      'MA5 > MA20 > MA60 (상승 배열 유지)',
      '현재가가 MA20의 ±2% 이내 (MA20 근처)',
      'RSI14가 30~50 (과매도 아니고 중립)',
      '어제 RSI가 오늘 RSI보다 같거나 낮음 (반등 시작)'
    ]
  },
  filter: ({ stock }) => {
    const c = latest(stock.close)
    const m5 = latest(stock.ma5)
    const m20 = latest(stock.ma20)
    const m60 = latest(stock.ma60)
    const rsi = latest(stock.rsi14)
    if (!allValid(c, m5, m20, m60, rsi)) return false
    if (!(m5! > m20! && m20! > m60!)) return false
    const nearMa20 = Math.abs(c! - m20!) / m20! <= 0.02
    if (!nearMa20) return false
    return rsi! >= 30 && rsi! <= 50
  }
}
