'use client'

import { useMemo } from 'react'
import { allPresets } from '@/lib/presets/registry'
import { strings } from '@/lib/strings/ko'
import Pill from '@/components/ui/Pill'
import type { StockIndicators, Fundamental } from '@/lib/types/indicators'

interface Props {
  stock: StockIndicators
  fundamental: Fundamental | undefined
}

export default function MatchedPresets({ stock, fundamental }: Props) {
  const matched = useMemo(() => {
    return allPresets.filter((p) => {
      try { return p.filter({ stock, fundamental, params: {} }) }
      catch { return false }
    })
  }, [stock, fundamental])

  if (matched.length === 0) {
    return <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{strings.stock.noMatches}</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {matched.map((p) => (
        <Pill key={p.id} variant="accent">{p.name}</Pill>
      ))}
    </div>
  )
}
