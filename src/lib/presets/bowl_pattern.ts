import { strings } from '@/lib/strings/ko'
import { latest, allValid } from './utils'
import type { Preset } from './types'

/**
 * Beta 밥그릇 패턴 (Cup / Saucer Pattern, 224일선 기반)
 *
 * 장기선(MA224) 부근에서 저점을 형성하고 반등하는 U자형 패턴을 탐지.
 * 200일선을 많이 쓰지만 한국 증권가 일부에서 "224일선(=32주)"을 장기 추세선으로 사용함.
 */
export const bowlPattern: Preset = {
  id: 'bowl_pattern',
  name: 'Beta 🍚 밥그릇 패턴',
  mode: ['beginner', 'expert'],
  beta: true,
  params: [],
  description: {
    beginner: '장기 저점에서 U자로 반등 시작한 종목 (Beta)',
    expert: 'MA224 부근 90일 저점 형성 + 반등 + 거래량 회복'
  },
  buyTiming: '저점 대비 3~10% 회복 + 거래량 증가 확인 시점',
  holdingPeriod: '2~6개월 (중장기 반등 추종)',
  stopLoss: '저점(bowl_low_90d) 재이탈 시',
  traps: '횡보 기간이 너무 짧거나 저점이 아직 확정되지 않았으면 V자 일수 있음. 확률 참고.',
  formula: {
    summary: '장기선(MA224) 부근 저점 형성 후 반등 시작 구간을 탐지',
    baseConditions: [
      '상장 후 224거래일 이상 경과 (MA224 계산 가능)',
      '최근 90일 내 저점이 MA224 × 0.90 ~ 1.08 구간 안에 있음 (장기선 부근 저점)',
      '저점 발생 시점이 10~60일 전 (바닥 다지기 기간)',
      '현재 종가 ≥ 저점 × 1.03 (최소 3% 회복)',
      '현재 종가 > MA20 (단기 상승 전환)'
    ],
    bonusConditions: [
      '거래량 회복비 = 최근 5일 평균 거래량 ÷ 저점 근처 20일 평균 ≥ 1.3 (거래량 증가)',
      '외국인 순매수 최근 3일 모두 양수 (외국 수급 가산)'
    ],
    reference: '일반 교과서는 200일선을 사용. 224일선(=32주)은 일부 한국 증권 자료에서 중장기 추세선으로 사용됨. Beta 단계로 공식 확정 아님.'
  },

  filter: ({ stock, fundamental }) => {
    // 필수 1: MA224 + 90일 데이터 충분
    if (!stock.has_224) return false
    if (stock.bowl_low_90d == null) return false
    if (stock.bowl_days_since_low == null) return false

    const ma224Latest = latest(stock.ma224 ?? [])
    if (ma224Latest == null) return false

    // 필수 2: 저점이 장기선 부근
    const low = stock.bowl_low_90d
    if (low < ma224Latest * 0.90) return false
    if (low > ma224Latest * 1.08) return false

    // 필수 3: 저점 시점 적절
    const daysAgo = stock.bowl_days_since_low
    if (daysAgo < 10 || daysAgo > 60) return false

    // 필수 4: 회복 시작
    const close = latest(stock.close)
    const ma20 = latest(stock.ma20)
    if (!allValid(close, ma20)) return false
    if (close! < low * 1.03) return false
    if (close! <= ma20!) return false

    // 필수 조건 통과. 보너스는 점수에만 반영.
    return true
  },

  sortScore: ({ stock, fundamental }) => {
    // 회복률(%) + 거래량 회복 보너스 + 외국인 수급 보너스
    const close = latest(stock.close) ?? 0
    const low = stock.bowl_low_90d ?? close
    const recoveryPct = low > 0 ? ((close - low) / low) * 100 : 0

    let bonus = 0
    if ((stock.bowl_vol_recovery ?? 0) >= 1.3) bonus += 5
    if (fundamental?.foreign_net) {
      const last3 = fundamental.foreign_net.slice(-3)
      if (last3.length === 3 && last3.every((x) => x > 0)) bonus += 5
    }

    return recoveryPct + bonus
  }
}
