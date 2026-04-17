const DAY_MS = 24 * 60 * 60 * 1000

export function computeDecayFactor(activatedAtMs: number | undefined, nowMs: number = Date.now()): number {
  if (activatedAtMs == null) return 1
  const ageDays = (nowMs - activatedAtMs) / DAY_MS
  if (ageDays < 14) return 1.0
  if (ageDays < 30) return 0.85
  if (ageDays < 60) return 0.70
  if (ageDays < 90) return 0.50
  if (ageDays < 120) return 0.30
  return 0.20
}
