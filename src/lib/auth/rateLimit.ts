const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

interface Entry {
  count: number
  resetAt: number
}

const store = new Map<string, Entry>()

export function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || now >= entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }

  if (entry.count >= MAX_ATTEMPTS) return false

  entry.count += 1
  return true
}

export function _resetRateLimitStore(): void {
  store.clear()
}
