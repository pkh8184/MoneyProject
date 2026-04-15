import type { UpdatedAtJson } from '@/lib/types/indicators'

export type FreshnessLevel = 'fresh' | 'stale24h' | 'stale48h'

const H24_MS = 24 * 60 * 60 * 1000
const H48_MS = 48 * 60 * 60 * 1000

export function getFreshnessLevel(updatedAtMs: number, nowMs: number): FreshnessLevel {
  const diff = nowMs - updatedAtMs
  if (diff > H48_MS) return 'stale48h'
  if (diff > H24_MS) return 'stale24h'
  return 'fresh'
}

export function formatRelative(updatedAtMs: number, nowMs: number): string {
  const diffSec = Math.floor((nowMs - updatedAtMs) / 1000)
  if (diffSec < 60) return '방금 전'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}분 전`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}시간 전`
  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay}일 전`
}

export async function loadUpdatedAt(): Promise<UpdatedAtJson | null> {
  try {
    const res = await fetch('/data/updated_at.json', { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as UpdatedAtJson
  } catch {
    return null
  }
}
