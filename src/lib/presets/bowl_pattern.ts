import { latest, allValid } from './utils'
import type { Preset } from './types'

/**
 * Beta 밥그릇 패턴 (Cup / Saucer Pattern, 224일선 기반)
 *
 * 밥그릇 기법의 4단계 흐름:
 *   ① 급락 (역배열): 장기>중기>단기 MA로 완연한 역배열 + 주가 하락
 *   ② 횡보·매집 (수렴): 하락 멈추고 박스권. MA들이 수렴하며 에너지 응축
 *   ③ 공이 (추세 전환): 장기선 돌파 + 골든크로스. 역배열이 정배열로 바뀌는 변곡점
 *   ④ 폭등 (정배열): 단기>중기>장기 완벽 정배열에서 상승 본격화
 * 목표는 ③ 구간 진입 직후 매수.
 */
export const bowlPattern: Preset = {
  id: 'bowl_pattern',
  name: 'Beta 🍚 밥그릇 패턴',
  mode: ['beginner', 'expert'],
  category: 'pattern',
  shortFormula: '① 급락 → ② 횡보·매집 → ③ 공이(골든크로스) → ④ 정배열',
  beta: true,
  params: [],
  description: {
    beginner: '바닥에서 한동안 기다가 드디어 오르기 시작한 종목 (밥그릇 모양)',
    expert: '역배열(급락) → 수렴(매집) → 골든크로스(공이) → 정배열(상승) 4단계를 거친 종목'
  },
  buyTiming: '③ 공이 구간 직후 — 골든크로스 직후 거래량 증가 확인 시점',
  holdingPeriod: '2~6개월 (④ 정배열 구간 중장기 추종)',
  stopLoss: '저점 재이탈 시 (② 횡보 구간으로 되돌아가면 패턴 실패)',
  traps: 'V자 반등은 ② 횡보·매집 구간이 거의 없음. 매집 구간 없이 급등한 종목은 실패 확률이 높음.',
  formula: {
    summary: '① 급락(역배열) → ② 횡보·매집(MA 수렴) → ③ 공이(골든크로스) → ④ 정배열 전환 + 거래량 품질 검증',
    baseConditions: [
      '상장 후 224거래일 이상 경과',
      '최근 90일 저점이 MA224 × 0.90 ~ 1.08 구간 (장기선 부근 저점)',
      '저점 발생 10~60일 전 (바닥 다지기 기간)',
      '[① 급락] 저점 당시 역배열 상태 (MA5 < MA20 < MA60 < MA120)',
      '[② 횡보·매집] 저점 이후 close가 저점 대비 ±15% 밴드에 머문 날 ≥ 30% (V자 반등 배제)',
      '[② 횡보·매집] 저점 이후 MA5/MA20/MA60 최소 스프레드 ≤ 5% (수렴 확인)',
      '[③ 공이] 최근 20일 내 골든크로스 발생 (MA20 ↑ MA60)',
      '[④ 정배열] 현재 정배열 형성 (MA5 > MA20 > MA60)',
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
    reference: 'Beta 단계. 한국 시장 밥그릇 기법 4단계 흐름 검증. 거래량 품질은 6단계 가중 합산(0~100).'
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

    // ★ 4단계 흐름 검증
    // ① 급락: 저점 당시 역배열이었는가?
    if (stock.bowl_low_was_inverted !== true) return false
    // ② 횡보·매집 (신규): 저점 이후 ±15% 밴드에 30% 이상의 날이 머물렀는가? (V자 반등 배제)
    if (stock.bowl_sideways_days_ratio == null || stock.bowl_sideways_days_ratio < 0.30) return false
    // ② 횡보·매집 (신규): MA들이 수렴 구간을 거쳤는가? (5% 이내 스프레드 최소값 필요)
    if (stock.bowl_ma_convergence_min == null || stock.bowl_ma_convergence_min > 0.05) return false
    // ③ 공이: 최근 20일 내 골든크로스 발생했는가?
    if (stock.bowl_has_recent_golden_cross !== true) return false
    // ④ 정배열: 현재 MA5 > MA20 > MA60 정배열 형성?
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
