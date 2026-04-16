'use client'

import { useEffect, useState } from 'react'
import { loadUpdatedAt, getFreshnessLevel, formatRelative } from '@/lib/dataLoader'
import { strings } from '@/lib/strings/ko'

type Status = 'loading' | 'fresh' | 'stale24h' | 'stale48h' | 'missing'

export default function UpdatedAtBadge() {
  const [status, setStatus] = useState<Status>('loading')
  const [relative, setRelative] = useState<string>('')
  const [refreshType, setRefreshType] = useState<'full' | 'light' | undefined>(undefined)

  useEffect(() => {
    loadUpdatedAt().then((data) => {
      if (!data) { setStatus('missing'); return }
      const now = Date.now()
      const updated = new Date(data.updated_at).getTime()
      setStatus(getFreshnessLevel(updated, now))
      setRelative(formatRelative(updated, now))
      setRefreshType(data.type)
    })
  }, [])

  if (status === 'loading') return null
  if (status === 'missing') return null

  const dot = status === 'fresh' ? '🟢' : status === 'stale24h' ? '🟡' : '🔴'
  const base =
    status === 'fresh' ? strings.dataStatus.updatedAt(relative) :
    status === 'stale24h' ? strings.dataStatus.stale24h :
    strings.dataStatus.stale48h

  const typeLabel = refreshType === 'full'
    ? '(전체)'
    : refreshType === 'light'
    ? '(수급)'
    : ''

  return (
    <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark inline-flex items-center gap-1">
      <span aria-hidden>{dot}</span>
      <span>
        {base}
        {typeLabel && <span className="ml-1 opacity-70">{typeLabel}</span>}
      </span>
    </span>
  )
}
