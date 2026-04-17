'use client'
import { useEffect, useState } from 'react'
import type { MacroIndicatorsJson, FundamentalsJson } from '@/lib/types/indicators'
import { loadMacroIndicators, loadUpdatedAt } from '@/lib/dataLoader'

export function detectFromIndicators(indicators: MacroIndicatorsJson | null): string[] {
  if (!indicators) return []
  const detected: string[] = []

  const forex = indicators.forex_usd_krw
  if (forex?.change_20d_pct != null) {
    if (forex.change_20d_pct >= 3) detected.push('krw_weak')
    else if (forex.change_20d_pct <= -3) detected.push('krw_strong')
  }

  const oil = indicators.oil_wti
  if (oil?.change_20d_pct != null) {
    if (oil.change_20d_pct >= 10) detected.push('oil_up')
    else if (oil.change_20d_pct <= -10) detected.push('oil_down')
  }

  const kospi = indicators.kospi
  if (kospi) {
    const d5 = kospi.change_5d_pct
    const vm = kospi.vs_ma20_pct
    if ((d5 != null && d5 <= -3) || (vm != null && vm <= -5)) {
      detected.push('kospi_crash')
    }
  }

  return detected
}

export function detectForeignTrend(fundamentals: FundamentalsJson | null): 'sell' | 'buy' | null {
  if (!fundamentals) return null
  let sellDays = 0
  let buyDays = 0
  let totalSamples = 0
  for (const code of Object.keys(fundamentals)) {
    const f = fundamentals[code]
    if (!f.foreign_net || f.foreign_net.length < 10) continue
    const recent10 = f.foreign_net.slice(-10)
    for (const v of recent10) {
      if (v < 0) sellDays++
      else if (v > 0) buyDays++
    }
    totalSamples += recent10.length
    if (totalSamples > 500) break
  }
  if (totalSamples === 0) return null
  const sellRatio = sellDays / totalSamples
  const buyRatio = buyDays / totalSamples
  if (sellRatio >= 0.6) return 'sell'
  if (buyRatio >= 0.6) return 'buy'
  return null
}

export function useMacroAutoDetect(fundamentals: FundamentalsJson | null): string[] {
  const [detected, setDetected] = useState<string[]>([])

  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) return
      const ind = await loadMacroIndicators(u.trade_date)
      const ids = detectFromIndicators(ind)
      const trend = detectForeignTrend(fundamentals)
      if (trend === 'sell') ids.push('foreign_sell')
      else if (trend === 'buy') ids.push('foreign_buy')
      setDetected(ids)
    })
  }, [fundamentals])

  return detected
}
