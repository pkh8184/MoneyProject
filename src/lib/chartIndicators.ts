/**
 * 브라우저 측 지표 계산 (3년치 OHLCV 기반 차트 오버레이용).
 * Python 파이프라인과 동일한 공식을 유지.
 */

export function computeMA(closes: number[], window: number): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null)
  let sum = 0
  for (let i = 0; i < closes.length; i++) {
    sum += closes[i]
    if (i >= window) sum -= closes[i - window]
    if (i >= window - 1) out[i] = sum / window
  }
  return out
}

export function computeRSI(closes: number[], period: number = 14): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null)
  if (closes.length < period + 1) return out
  const alpha = 1 / period
  let avgGain = 0
  let avgLoss = 0
  for (let i = 1; i <= period; i++) {
    const delta = closes[i] - closes[i - 1]
    avgGain += Math.max(delta, 0)
    avgLoss += Math.max(-delta, 0)
  }
  avgGain /= period
  avgLoss /= period
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
  for (let i = period + 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1]
    const gain = Math.max(delta, 0)
    const loss = Math.max(-delta, 0)
    avgGain = (1 - alpha) * avgGain + alpha * gain
    avgLoss = (1 - alpha) * avgLoss + alpha * loss
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
  }
  return out
}

export function computeEMA(values: number[], span: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null)
  if (values.length === 0) return out
  const alpha = 2 / (span + 1)
  out[0] = values[0]
  for (let i = 1; i < values.length; i++) {
    const prev = out[i - 1] as number
    out[i] = alpha * values[i] + (1 - alpha) * prev
  }
  return out
}

export function computeMACD(closes: number[]): {
  line: (number | null)[]
  signal: (number | null)[]
  hist: (number | null)[]
} {
  const ema12 = computeEMA(closes, 12)
  const ema26 = computeEMA(closes, 26)
  const line: (number | null)[] = closes.map((_, i) => {
    const a = ema12[i]
    const b = ema26[i]
    if (a == null || b == null) return null
    return a - b
  })
  const lineNumbers = line.map((x) => (x == null ? 0 : x))
  const signal = computeEMA(lineNumbers, 9)
  const hist: (number | null)[] = line.map((l, i) => {
    const s = signal[i]
    if (l == null || s == null) return null
    return l - s
  })
  return { line, signal, hist }
}

export function computeBB(closes: number[], window: number = 20, mult: number = 2): {
  upper: (number | null)[]
  middle: (number | null)[]
  lower: (number | null)[]
} {
  const middle = computeMA(closes, window)
  const upper: (number | null)[] = new Array(closes.length).fill(null)
  const lower: (number | null)[] = new Array(closes.length).fill(null)
  for (let i = window - 1; i < closes.length; i++) {
    const slice = closes.slice(i - window + 1, i + 1)
    const mean = middle[i] as number
    const variance = slice.reduce((acc, v) => acc + (v - mean) ** 2, 0) / window
    const std = Math.sqrt(variance)
    upper[i] = mean + mult * std
    lower[i] = mean - mult * std
  }
  return { upper, middle, lower }
}
