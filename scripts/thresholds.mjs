export const WARNING_PCT = 0.80
export const CRITICAL_PCT = 0.95

export function getLevel(used, limit) {
  if (!limit || limit <= 0) return 'ok'
  const ratio = used / limit
  if (ratio >= CRITICAL_PCT) return 'critical'
  if (ratio >= WARNING_PCT) return 'warning'
  return 'ok'
}

export function isOverWarning(used, limit) {
  return getLevel(used, limit) !== 'ok'
}

export function isOverCritical(used, limit) {
  return getLevel(used, limit) === 'critical'
}
