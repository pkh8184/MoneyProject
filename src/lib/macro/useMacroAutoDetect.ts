'use client'
import { useEffect, useState } from 'react'
import type { MacroIndicatorsJson, FundamentalsJson, NewsSignalsJson } from '@/lib/types/indicators'
import { loadMacroIndicators, loadNewsSignals, loadUpdatedAt } from '@/lib/dataLoader'

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

export function detectFromNews(news: NewsSignalsJson | null, threshold: number = 5): string[] {
  if (!news) return []
  const detected: string[] = []
  for (const [factorId, sig] of Object.entries(news.signals)) {
    if (sig.count >= threshold) detected.push(factorId)
  }
  return detected
}

export function useMacroAutoDetect(fundamentals: FundamentalsJson | null): {
  detectedIds: string[]
  indicators: MacroIndicatorsJson | null
  news: NewsSignalsJson | null
} {
  const [detectedIds, setDetectedIds] = useState<string[]>([])
  const [indicators, setIndicators] = useState<MacroIndicatorsJson | null>(null)
  const [news, setNews] = useState<NewsSignalsJson | null>(null)

  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) return
      const [ind, n] = await Promise.all([
        loadMacroIndicators(u.trade_date),
        loadNewsSignals(u.trade_date)
      ])
      setIndicators(ind)
      setNews(n)
      const fromIndicators = detectFromIndicators(ind)
      const fromNews = detectFromNews(n)
      const trend = detectForeignTrend(fundamentals)
      const merged = new Set<string>([...fromIndicators, ...fromNews])
      if (trend === 'sell') merged.add('foreign_sell')
      else if (trend === 'buy') merged.add('foreign_buy')
      setDetectedIds([...merged])
    })
  }, [fundamentals])

  return { detectedIds, indicators, news }
}
