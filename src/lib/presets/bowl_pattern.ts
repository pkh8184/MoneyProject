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
  category: 'pattern',
  shortFormula: '역배열 저점 → 골든크로스 → 정배열 전환',
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
    summary: '역배열 저점 → 골든크로스 → 정배열 전환 + 거래량 품질 검증',
    baseConditions: [
      '상장 후 224거래일 이상 경과',
      '최근 90일 저점이 MA224 × 0.90 ~ 1.08 구간 (장기선 부근 저점)',
      '저점 발생 10~60일 전 (바닥 다지기 기간)',
      '저점 당시 역배열 상태 (MA5 < MA20 < MA60 < MA120)',
      '최근 20일 내 골든크로스 발생 (MA20 ↑ MA60)',
      '현재 정배열 형성 (MA5 > MA20 > MA60)',
      '현재 종가 ≥ 저점 × 1.03 (3% 이상 회복)',
      '현재 종가 > MA20',
      '거래량 품질 점수 ≥ 60점 (6단계 가중 합산)'
    ],
    bonusConditions: [
      '① Dry-up 비율 < 0.6 (바닥 거래량 말라듦): 최대 30점',
      '② Explosion 비율 ≥ 2.0 (반등 거래량 폭발): 최대 25점',
      '③ Value 팽창 ≥ 2.0 (가격·대금 동반): 최대 15점',
      '④ 매집 봉 ≥ 3개 (저점 중 양봉+2배 거래량): 최대 15점',
      '⑤ 거래량 기울기 > 0.015 (점진적 증가): 최대 10점',
      '⑥ 외국인 순매수 비율 ≥ 60%: 최대 5점'
    ],
    reference: 'Beta 단계. 전통 교과서 외의 한국 시장 특수 공식. 거래량 품질은 6단계 가중 합산(0~100).'
  },

  filter: ({ stock, fundamental }) => {
    // 필수: MA224 + 저점 메타
    if (!stock.has_224) return false
    if (stock.bowl_low_90d == null) return false
    if (stock.bowl_days_since_low == null) return false

    const ma224Latest = latest(stock.ma224 ?? [])
    if (ma224Latest == null) return false

    const low = stock.bowl_low_90d
    if (low < ma224Latest * 0.90) return false
    if (low > ma224Latest * 1.08) return false

    const daysAgo = stock.bowl_days_since_low
    if (daysAgo < 10 || daysAgo > 60) return false

    const close = latest(stock.close)
    const ma20 = latest(stock.ma20)
    if (!allValid(close, ma20)) return false
    if (close! < low * 1.03) return false
    if (close! <= ma20!) return false

    // ★ 역배열 → 정배열 전환 3중 검증
    // ① 저점 당시 역배열이었는가?
    if (stock.bowl_low_was_inverted !== true) return false
    // ② 최근 20일 내 골든크로스 발생했는가?
    if (stock.bowl_has_recent_golden_cross !== true) return false
    // ③ 현재 MA5 > MA20 > MA60 정배열 형성?
    if (stock.bowl_current_aligned !== true) return false

    // 거래량 품질 점수 ≥ 60
    const baseScore = stock.bowl_volume_score ?? 0
    let foreignBonus = 0
    if (fundamental?.foreign_net && fundamental.foreign_net.length >= 10) {
      const positive = fundamental.foreign_net.filter((v) => v > 0).length
      const ratio = positive / fundamental.foreign_net.length
      if (ratio >= 0.6) foreignBonus = 5
      else if (ratio >= 0.4) foreignBonus = 3
    }
    const totalScore = baseScore + foreignBonus
    if (totalScore < 60) return false

    return true
  },

  sortScore: ({ stock, fundamental }) => {
    const close = latest(stock.close) ?? 0
    const low = stock.bowl_low_90d ?? close
    const recoveryPct = low > 0 ? ((close - low) / low) * 100 : 0
    const volScore = stock.bowl_volume_score ?? 0
    let foreignBonus = 0
    if (fundamental?.foreign_net && fundamental.foreign_net.length >= 10) {
      const positive = fundamental.foreign_net.filter((v) => v > 0).length
      const ratio = positive / fundamental.foreign_net.length
      if (ratio >= 0.6) foreignBonus = 5
      else if (ratio >= 0.4) foreignBonus = 3
    }
    return volScore + foreignBonus + recoveryPct * 0.1
  }
}
