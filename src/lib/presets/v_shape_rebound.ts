import { latest, allValid } from './utils'
import type { Preset } from './types'

export const vShapeRebound: Preset = {
  id: 'v_shape_rebound',
  name: 'V자 반등',
  mode: ['expert'],
  category: 'pattern',
  shortFormula: '10일 내 5%↓ 후 3일 연속 양봉 반등',
  params: [],
  description: {
    beginner: '급락 후 빠르게 반등 시작한 종목',
    expert: '최근 10일 내 -5% 이상 하락 후 3일 연속 양봉 반등'
  },
  buyTiming: '반등 3일차 종가 근처',
  holdingPeriod: '3일~3주',
  stopLoss: '반등 구간 저점 이탈',
  traps: '반등 후 재하락 가능성 (dead cat bounce)',
  formula: {
    summary: '급락 직후 강한 반등의 V자 패턴',
    baseConditions: [
      '최근 10일 내 어느 하루에 종가 기준 -5% 이상 단일일 하락',
      '그 이후 3일 연속 양봉 (close[t] > close[t-1])',
      '현재가가 최근 10일 저점 대비 +3% 이상'
    ]
  },
  filter: ({ stock }) => {
    const n = stock.close.length
    if (n < 11) return false
    // 3 consecutive up candles
    for (let i = 0; i < 3; i++) {
      const c = stock.close[n - 1 - i]
      const prev = stock.close[n - 2 - i]
      if (c == null || prev == null) return false
      if (c <= prev) return false
    }
    // single-day drop ≥5% in last 10 days
    let hadDrop = false
    for (let i = n - 10; i < n; i++) {
      const c = stock.close[i]
      const p = stock.close[i - 1]
      if (c == null || p == null || p === 0) continue
      if ((c - p) / p <= -0.05) { hadDrop = true; break }
    }
    if (!hadDrop) return false
    // current vs 10-day low
    const recent10 = stock.close.slice(-10).filter((x): x is number => x != null)
    if (recent10.length === 0) return false
    const low = Math.min(...recent10)
    const now = stock.close[n - 1]
    if (now == null || low === 0) return false
    return (now - low) / low >= 0.03
  }
}
