import { latest, allValid } from './utils'
import type { Preset } from './types'

export const safeLargeCap: Preset = {
  id: 'safe_large_cap',
  name: '대형주 안전 장기',
  mode: ['beginner', 'expert'],
  category: 'combo',
  shortFormula: '시총 ≥ 1조 AND 정배열 AND 외국인 과반 매수',
  params: [],
  description: {
    beginner: '시가총액이 큰 우량주 중 장기 추세 확정',
    expert: '시총 1조↑ + MA 정배열 + 외국인 최근 10일 중 6일 이상 순매수'
  },
  buyTiming: '추세 확정 시 분할 매수',
  holdingPeriod: '3개월 이상 (장기)',
  stopLoss: 'MA20 하향 이탈',
  traps: '대형주는 급등 어려움, 배당 및 장기 관점 필요',
  formula: {
    summary: '대형 우량주 장기 투자 후보',
    baseConditions: [
      '시가총액 ≥ 1조원',
      'MA5 > MA20 > MA60 > MA120 (정배열)',
      '외국인 최근 10일 순매수 일수 ≥ 6일'
    ]
  },
  filter: ({ stock, fundamental }) => {
    if (!fundamental || fundamental.market_cap < 1_000_000_000_000) return false
    const m5 = latest(stock.ma5)
    const m20 = latest(stock.ma20)
    const m60 = latest(stock.ma60)
    const m120 = latest(stock.ma120)
    if (!allValid(m5, m20, m60, m120)) return false
    if (!(m5! > m20! && m20! > m60! && m60! > m120!)) return false
    const fnet = fundamental.foreign_net.slice(-10)
    if (fnet.length < 10) return false
    const positive = fnet.filter((x) => x > 0).length
    return positive >= 6
  },
  sortScore: ({ fundamental }) => fundamental?.market_cap ?? 0
}
