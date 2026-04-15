'use client'

import { useMemo } from 'react'
import { allPresets } from '@/lib/presets/registry'
import { strings } from '@/lib/strings/ko'
import type { StockIndicators, Fundamental } from '@/lib/types/indicators'

interface Props {
  stock: StockIndicators
  fundamental: Fundamental | undefined
}

export default function BeginnerGuide({ stock, fundamental }: Props) {
  const matched = useMemo(() => {
    return allPresets.filter((p) => {
      try { return p.filter({ stock, fundamental, params: {} }) } catch { return false }
    })
  }, [stock, fundamental])

  const primary = matched[0]

  return (
    <div className="space-y-4">
      <section>
        <h3 className="font-bold text-base mb-2">{strings.stock.beginnerWhyNow}</h3>
        {matched.length > 0 ? (
          <ul className="text-sm space-y-1">
            {matched.slice(0, 3).map((p) => (
              <li key={p.id}>• {p.description.beginner}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
            현재 매칭되는 신호 없음
          </p>
        )}
      </section>

      {primary && (
        <section className="bg-bg-secondary-light dark:bg-bg-secondary-dark rounded-xl p-4">
          <h3 className="font-bold text-base mb-2">{strings.stock.beginnerGuide}</h3>
          <ul className="text-sm space-y-1">
            <li>• <strong>{strings.stock.buyTiming}:</strong> {primary.buyTiming}</li>
            <li>• <strong>{strings.stock.holdingPeriod}:</strong> {primary.holdingPeriod}</li>
            <li>• <strong>{strings.stock.stopLoss}:</strong> {primary.stopLoss}</li>
          </ul>
        </section>
      )}

      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
        {strings.stock.caution}
      </p>
    </div>
  )
}
