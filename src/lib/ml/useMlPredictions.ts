'use client'
import { useEffect, useState } from 'react'
import { loadMlPredictions, loadUpdatedAt } from '@/lib/dataLoader'
import type { MLPredictionsJson } from '@/lib/types/indicators'

export function useMlPredictions(): MLPredictionsJson | null {
  const [data, setData] = useState<MLPredictionsJson | null>(null)

  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) return
      const d = await loadMlPredictions(u.trade_date)
      setData(d)
    })
  }, [])

  return data
}
