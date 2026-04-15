'use client'

import { useEffect, useState } from 'react'
import { loadUpdatedAt, getFreshnessLevel, formatRelative } from '@/lib/dataLoader'
import { strings } from '@/lib/strings/ko'

type Status = 'loading' | 'fresh' | 'stale24h' | 'stale48h' | 'missing'

export default function UpdatedAtBadge() {
  const [status, setStatus] = useState<Status>('loading')
  const [relative, setRelative] = useState<string>('')

  useEffect(() => {
    loadUpdatedAt().then((data) => {
      if (!data) { setStatus('missing'); return }
      const now = Date.now()
      const updated = new Date(data.updated_at).getTime()
      setStatus(getFreshnessLevel(updated, now))
      setRelative(formatRelative(updated, now))
    })
  }, [])

  if (status === 'loading') return null
  if (status === 'missing') return null

  const dot = status === 'fresh' ? '🟢' : status === 'stale24h' ? '🟡' : '🔴'
  const label =
    status === 'fresh' ? strings.dataStatus.updatedAt(relative) :
    status === 'stale24h' ? strings.dataStatus.stale24h :
    strings.dataStatus.stale48h

  return (
    <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark inline-flex items-center gap-1">
      <span aria-hidden>{dot}</span>
      <span>{label}</span>
    </span>
  )
}
