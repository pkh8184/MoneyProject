// src/lib/stockMomentum/detectors.ts
import type { Signal, DetectContext } from './types'
import { PANEL_ANCHORS } from './types'
import { detectBowlPhase } from '@/lib/bowl/detectPhase'
import { strings } from '@/lib/strings/ko'

const S = strings.momentum.signals

// ----- helpers -----
function last<T>(arr: readonly T[] | undefined | null, offset: number = 0): T | undefined {
  if (!arr || arr.length === 0) return undefined
  const idx = arr.length - 1 - offset
  if (idx < 0) return undefined
  return arr[idx]
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function crossedUp(seriesA: readonly (number | null)[], seriesB: readonly (number | null)[], withinDays: number): { crossed: boolean; daysAgo: number | null } {
  for (let offset = 0; offset < withinDays; offset++) {
    const aT = last(seriesA, offset)
    const aY = last(seriesA, offset + 1)
    const bT = last(seriesB, offset)
    const bY = last(seriesB, offset + 1)
    if (!isNum(aT) || !isNum(aY) || !isNum(bT) || !isNum(bY)) continue
    if (aT > bT && aY <= bY) return { crossed: true, daysAgo: offset }
  }
  return { crossed: false, daysAgo: null }
}

// ----- #1. 단기 추세 전환 -----
export function detectShortTermTrendChange(ctx: DetectContext): Signal | null {
  const { stock } = ctx
  const conditions: string[] = []
  let minDaysAgo = 99

  // a. MA20 > MA60 상향 돌파 (최근 3일)
  const gc = crossedUp(stock.ma20, stock.ma60, 3)
  if (gc.crossed) {
    conditions.push(S.shortTermTrend.condMa)
    if (gc.daysAgo! < minDaysAgo) minDaysAgo = gc.daysAgo!
  }

  // b+c. MACD 상승 전환 — line↑signal 또는 hist 음→양 (동일 이벤트 이중 집계 방지)
  const mc = crossedUp(stock.macd_line, stock.macd_signal, 3)
  let macdDaysAgo: number | null = mc.crossed ? mc.daysAgo : null
  if (!mc.crossed) {
    for (let offset = 0; offset < 3; offset++) {
      const hT = last(stock.macd_hist, offset)
      const hY = last(stock.macd_hist, offset + 1)
      if (!isNum(hT) || !isNum(hY)) continue
      if (hY <= 0 && hT > 0) {
        macdDaysAgo = offset
        break
      }
    }
  }
  if (macdDaysAgo !== null) {
    conditions.push(S.shortTermTrend.condMacd)
    if (macdDaysAgo < minDaysAgo) minDaysAgo = macdDaysAgo
  }

  // d. MA5 > MA20 > MA60 (MA120 미만 or 없음)
  const m5 = last(stock.ma5)
  const m20 = last(stock.ma20)
  const m60 = last(stock.ma60)
  const m120 = last(stock.ma120)
  if (isNum(m5) && isNum(m20) && isNum(m60) && m5 > m20 && m20 > m60) {
    if (!isNum(m120) || m120 >= m60) {
      conditions.push(S.shortTermTrend.condAlign)
    }
  }

  if (conditions.length === 0) return null
  const strength: 1 | 2 | 3 = conditions.length >= 3 ? 3 : conditions.length === 2 ? 2 : 1
  const timing = minDaysAgo === 0 ? 'latest' : (minDaysAgo <= 3 ? 'recent' : 'ongoing')
  return {
    id: 'short_term_trend_change',
    category: 'chart',
    tone: 'bullish',
    strength,
    timing,
    label: S.shortTermTrend.label,
    description: S.shortTermTrend.description,
    detail: conditions.join(' · '),
    linkAnchor: PANEL_ANCHORS.matchedPresets
  }
}

// ----- #2. 거래량 이상 -----
export function detectVolumeAnomaly(ctx: DetectContext): Signal | null {
  const { stock } = ctx
  const vol = stock.volume
  const volAvg20 = stock.vol_avg20
  const close = stock.close
  const open = stock.open
  if (!vol || vol.length < 21 || !close || close.length < 21) return null

  const today = vol[vol.length - 1]
  const yestClose = close[close.length - 2]
  const todayClose = close[close.length - 1]
  if (!isNum(todayClose) || !isNum(yestClose)) return null
  const todayOpen = open ? open[open.length - 1] : undefined
  const isBull = isNum(todayOpen) ? todayClose > todayOpen : todayClose > yestClose

  const conditions: string[] = []

  // 오늘 거래량 ≥ 20일 평균 × 1.5 & 양봉
  if (isNum(today) && isNum(volAvg20) && volAvg20 > 0 && today >= volAvg20 * 1.5 && isBull) {
    const ratio = today / volAvg20
    conditions.push(S.volumeAnomaly.spike(ratio.toFixed(1)))
  }

  // 최근 10일 평균 > 이전 10일 평균 × 1.3
  if (vol.length >= 21) {
    const recent = vol.slice(-10).reduce((a, b) => a + (b ?? 0), 0) / 10
    const prev = vol.slice(-20, -10).reduce((a, b) => a + (b ?? 0), 0) / 10
    if (prev > 0 && recent > prev * 1.3) {
      conditions.push(S.volumeAnomaly.trend)
    }
  }

  if (conditions.length === 0) return null
  const strength: 1 | 2 | 3 = conditions.length === 2 ? 2 : 1
  return {
    id: 'volume_anomaly',
    category: 'chart',
    tone: 'bullish',
    strength,
    timing: 'latest',
    label: S.volumeAnomaly.label,
    description: S.volumeAnomaly.description,
    detail: conditions.join(' · '),
    linkAnchor: PANEL_ANCHORS.bowlVolume
  }
}

// ----- #3. RSI 구간 양호 -----
export function detectRsiRebound(ctx: DetectContext): Signal | null {
  const { stock } = ctx
  const rsi = stock.rsi14
  if (!rsi || rsi.length < 6) return null
  const today = rsi[rsi.length - 1]
  const yest = rsi[rsi.length - 2]
  const back5 = rsi[rsi.length - 6]
  if (!isNum(today)) return null

  // A. 과매도 이탈 (가장 강력)
  if (isNum(yest) && yest < 30 && today >= 30) {
    return {
      id: 'rsi_rebound',
      category: 'chart',
      tone: 'bullish',
      strength: 2,
      timing: 'latest',
      label: S.rsi.oversoldExit.label,
      description: S.rsi.oversoldExit.description,
      detail: S.rsi.oversoldExit.detail(yest.toFixed(0), today.toFixed(0)),
      linkAnchor: PANEL_ANCHORS.matchedPresets
    }
  }

  // C. 건강한 모멘텀 (50~70)
  if (today >= 50 && today <= 70 && isNum(back5) && today > back5) {
    return {
      id: 'rsi_rebound',
      category: 'chart',
      tone: 'bullish',
      strength: 1,
      timing: 'ongoing',
      label: S.rsi.healthy.label,
      description: S.rsi.healthy.description,
      detail: S.rsi.healthy.detail(today.toFixed(0)),
      linkAnchor: PANEL_ANCHORS.matchedPresets
    }
  }

  // B. 과매도 회복 (30~50)
  if (today > 30 && today < 50 && isNum(back5) && today > back5) {
    return {
      id: 'rsi_rebound',
      category: 'chart',
      tone: 'bullish',
      strength: 1,
      timing: 'recent',
      label: S.rsi.recovering.label,
      description: S.rsi.recovering.description,
      detail: S.rsi.recovering.detail(today.toFixed(0)),
      linkAnchor: PANEL_ANCHORS.matchedPresets
    }
  }

  return null
}

// ----- #4. 신고가 돌파 -----
export function detectNewHighBreak(ctx: DetectContext): Signal | null {
  const { stock, ohlcvFull } = ctx
  const close = stock.close
  if (!close || close.length < 2) return null
  const today = close[close.length - 1]
  const yest = close[close.length - 2]
  if (!isNum(today) || !isNum(yest)) return null

  // 52주 고점 — indicators.json의 단일 값 사용
  const high52w = stock.high52w
  const has52w = stock.has_52w
  const broke52w = has52w && isNum(high52w) && yest < high52w && today >= high52w
  const near52w = has52w && isNum(high52w) && today >= high52w * 0.995

  // 60일 고점 — ohlcvFull 필요 (indicators.json close는 30일)
  let broke60d = false
  if (ohlcvFull && ohlcvFull.close && ohlcvFull.close.length >= 61) {
    const fullCloses = ohlcvFull.close
    const tIdx = fullCloses.length - 1
    const high60 = Math.max(...fullCloses.slice(tIdx - 60, tIdx))
    const yestFull = fullCloses[tIdx - 1]
    if (isNum(yestFull) && yestFull < high60 && fullCloses[tIdx] >= high60) {
      broke60d = true
    }
  }

  if (!broke52w && !near52w && !broke60d) return null

  let strength: 1 | 2 | 3 = 1
  let label = ''
  if (broke52w) {
    strength = 3
    label = S.newHigh.break52w
  } else if (near52w && broke60d) {
    strength = 2
    label = S.newHigh.near52wAnd60d
  } else if (near52w) {
    strength = 1
    label = S.newHigh.near52w
  } else {
    strength = 1
    label = S.newHigh.break60d
  }

  return {
    id: 'new_high_break',
    category: 'chart',
    tone: 'bullish',
    strength,
    timing: 'latest',
    label,
    description: S.newHigh.description,
    linkAnchor: PANEL_ANCHORS.matchedPresets
  }
}

// ----- #5. 바닥 터치 반등 -----
export function detectBbLowerBounce(ctx: DetectContext): Signal | null {
  const { stock } = ctx
  const close = stock.close
  const bbLower = stock.bb_lower
  if (!close || !bbLower || close.length < 5) return null
  const today = close[close.length - 1]
  const yest = close[close.length - 2]
  if (!isNum(today) || !isNum(yest)) return null
  if (today <= yest) return null // 반등 아님

  // 최근 5일 중 하단 터치 횟수
  let touches = 0
  let consecutive = 0
  let maxConsecutive = 0
  for (let i = 0; i < 5; i++) {
    const c = close[close.length - 1 - i]
    const bbl = bbLower[bbLower.length - 1 - i]
    if (isNum(c) && isNum(bbl) && c <= bbl) {
      touches++
      consecutive++
      if (consecutive > maxConsecutive) maxConsecutive = consecutive
    } else {
      consecutive = 0
    }
  }

  if (touches === 0) return null
  const strength: 1 | 2 | 3 = touches >= 2 || maxConsecutive >= 3 ? 3 : 2
  return {
    id: 'bb_lower_bounce',
    category: 'chart',
    tone: 'bullish',
    strength,
    timing: 'latest',
    label: S.bbLowerBounce.label,
    description: S.bbLowerBounce.description,
    detail: S.bbLowerBounce.detail(touches),
    linkAnchor: PANEL_ANCHORS.matchedPresets
  }
}

// ----- #6. 수급 강세 -----
export function detectSupplyStrong(ctx: DetectContext): Signal | null {
  const { fundamental } = ctx
  if (!fundamental) return null
  const fn = fundamental.foreign_net
  const in_ = fundamental.institution_net

  const foreignStreak = fn && fn.length >= 10
    ? fn.slice(-10).filter((v) => v > 0).length >= 7
    : false
  const institutionStreak = in_ && in_.length >= 10
    ? in_.slice(-10).filter((v) => v > 0).length >= 7
    : false

  const todayForeign = fn ? fn[fn.length - 1] : undefined
  const maxRecent = fn && fn.length >= 10 ? Math.max(...fn.slice(-10)) : undefined
  const todayIsMax = isNum(todayForeign) && isNum(maxRecent) && todayForeign === maxRecent && todayForeign > 0

  if (!foreignStreak && !institutionStreak) return null

  let strength: 1 | 2 | 3 = 1
  const parts: string[] = []
  if (foreignStreak && institutionStreak) {
    strength = 3
    parts.push(S.supplyStrong.foreignAndInstitution)
  } else if ((foreignStreak || institutionStreak) && todayIsMax) {
    strength = 2
    parts.push(foreignStreak ? S.supplyStrong.foreignStreak : S.supplyStrong.institutionStreak)
    parts.push(S.supplyStrong.todayMax)
  } else {
    parts.push(foreignStreak ? S.supplyStrong.foreignStreak : S.supplyStrong.institutionStreak)
  }

  return {
    id: 'supply_strong',
    category: 'supply',
    tone: 'bullish',
    strength,
    timing: 'ongoing',
    label: S.supplyStrong.label,
    description: parts.join(' · '),
    detail: S.supplyStrong.detail,
    linkAnchor: PANEL_ANCHORS.matchedPresets
  }
}

// ----- #7. 매크로 환경 수혜 -----
export function detectMacroBenefit(ctx: DetectContext): Signal | null {
  const total = ctx.macroBonus?.total ?? 0
  const rotDelta = ctx.sectorRotation?.sectorRotationDelta ?? 0
  const isSectorStrong = rotDelta > 0
  if (total <= 0 && !isSectorStrong) return null

  let strength: 1 | 2 | 3 = 1
  const parts: string[] = []
  if (total + rotDelta >= 15 && total > 0 && isSectorStrong) {
    strength = 3
    parts.push(S.macroBenefit.factor(total), S.macroBenefit.sector(rotDelta))
  } else if (total >= 6 || (total > 0 && isSectorStrong)) {
    strength = 2
    if (total > 0) parts.push(S.macroBenefit.factor(total))
    if (isSectorStrong) parts.push(S.macroBenefit.sector(rotDelta))
  } else {
    if (total > 0) parts.push(S.macroBenefit.factor(total))
    if (isSectorStrong) parts.push(S.macroBenefit.sector(rotDelta))
  }

  return {
    id: 'macro_benefit',
    category: 'macro',
    tone: 'bullish',
    strength,
    timing: 'ongoing',
    label: S.macroBenefit.label,
    description: S.macroBenefit.description,
    detail: parts.join(' · '),
    linkAnchor: PANEL_ANCHORS.macroDetail
  }
}

// ----- #8. ML 예측 긍정 -----
export function detectMlBullish(ctx: DetectContext): Signal | null {
  const p = ctx.mlPrediction
  if (!p) return null
  const prob = p.probability
  if (prob < 0.6) return null

  const strength: 1 | 2 | 3 = prob >= 0.85 ? 3 : prob >= 0.7 ? 2 : 1
  return {
    id: 'ml_bullish',
    category: 'ml',
    tone: 'bullish',
    strength,
    timing: 'latest',
    label: S.mlBullish.label,
    description: S.mlBullish.description(Math.round(prob * 100)),
    detail: S.mlBullish.detail(p.ml_score),
    linkAnchor: PANEL_ANCHORS.mlPrediction
  }
}

// ----- #9. 과거 승률 양호 -----
export function detectHistoricalWinner(ctx: DetectContext): Signal | null {
  const { patternStats, matchedPresetIds } = ctx
  if (!patternStats || !matchedPresetIds || matchedPresetIds.length === 0) return null
  let sumWin = 0
  let sumAvg = 0
  let totalSamples = 0
  let count = 0
  for (const pid of matchedPresetIds) {
    const s = patternStats[pid]
    if (!s || s.sample_count < 5) continue
    const h = s.d14 ?? s.d7
    if (!h) continue
    sumWin += h.win_rate
    sumAvg += h.avg
    totalSamples += s.sample_count
    count++
  }
  if (count === 0) return null
  const avgWin = sumWin / count
  const avgReturn = sumAvg / count
  if (avgWin < 60) return null

  const strength: 1 | 2 | 3 = avgWin >= 80 ? 3 : avgWin >= 70 ? 2 : 1
  const avgStr = `${avgReturn > 0 ? '+' : ''}${avgReturn.toFixed(2)}`
  return {
    id: 'historical_winner',
    category: 'historical',
    tone: 'bullish',
    strength,
    timing: 'ongoing',
    label: S.historicalWinner.label,
    description: S.historicalWinner.description(Math.round(avgWin), avgStr),
    detail: S.historicalWinner.detail(totalSamples)
  }
}

// ----- #10. 밥그릇 공이 구간 -----
export function detectBowlPhase3(ctx: DetectContext): Signal | null {
  const { stock } = ctx
  const phase = detectBowlPhase(stock)
  if (phase !== 3) return null

  const volScore = stock.bowl_volume_score ?? 0
  const hasGC = stock.bowl_has_recent_golden_cross === true
  let strength: 1 | 2 | 3 = 1
  if (volScore >= 70 && hasGC) strength = 3
  else if (volScore >= 70) strength = 2

  return {
    id: 'bowl_phase_3',
    category: 'bowl',
    tone: 'bullish',
    strength,
    timing: 'ongoing',
    label: S.bowlPhase3.label,
    description: S.bowlPhase3.description,
    detail: S.bowlPhase3.detail(volScore),
    linkAnchor: PANEL_ANCHORS.bowlPhase
  }
}

// ----- #11. 과열·고점 근접 (주의) -----
export function detectOverheatedWarning(ctx: DetectContext): Signal | null {
  const { stock, fundamental } = ctx
  const rsi = last(stock.rsi14)
  const close = last(stock.close)
  const high52w = stock.high52w
  const per = fundamental?.per ?? null

  let count = 0
  const parts: string[] = []
  if (isNum(rsi) && rsi > 70) {
    count++
    parts.push(S.overheated.rsi(rsi.toFixed(0)))
  }
  if (isNum(close) && isNum(high52w) && stock.has_52w && close >= high52w * 0.95) {
    count++
    parts.push(S.overheated.near52w)
  }
  if (isNum(per) && per > 50) {
    count++
    parts.push(S.overheated.per(per.toFixed(0)))
  }

  if (count === 0) return null
  const strength: 1 | 2 | 3 = count >= 3 ? 3 : count === 2 ? 2 : 1
  return {
    id: 'overheated_warning',
    category: 'warning',
    tone: 'warning',
    strength,
    timing: 'latest',
    label: S.overheated.label,
    description: S.overheated.description,
    detail: parts.join(' · ')
  }
}

// ----- #12. 하락 추세 (주의) -----
export function detectDownTrendWarning(ctx: DetectContext): Signal | null {
  const { stock } = ctx
  const m5 = last(stock.ma5)
  const m20 = last(stock.ma20)
  const m60 = last(stock.ma60)
  const m120 = last(stock.ma120)

  let count = 0
  const parts: string[] = []
  if (isNum(m5) && isNum(m20) && isNum(m60) && isNum(m120) && m5 < m20 && m20 < m60 && m60 < m120) {
    count++
    parts.push(S.downTrend.inverted)
  }

  const vol = stock.volume
  if (vol && vol.length >= 21) {
    const recent5 = vol.slice(-5).reduce((a, b) => a + (b ?? 0), 0) / 5
    const avg20 = stock.vol_avg20
    if (isNum(avg20) && avg20 > 0 && recent5 <= avg20 * 0.7) {
      count++
      parts.push(S.downTrend.volumeWeak)
    }
  }

  if (count === 0) return null
  const strength: 1 | 2 | 3 = count >= 2 ? 2 : 1
  return {
    id: 'down_trend_warning',
    category: 'warning',
    tone: 'warning',
    strength: Math.min(strength, 3) as 1 | 2 | 3,
    timing: 'ongoing',
    label: S.downTrend.label,
    description: S.downTrend.description,
    detail: parts.join(' · ')
  }
}
