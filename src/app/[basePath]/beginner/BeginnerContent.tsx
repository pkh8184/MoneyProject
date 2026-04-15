'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import TodayRecommendSection from '@/components/screener/sections/TodayRecommendSection'
import LongTermSection from '@/components/screener/sections/LongTermSection'
import HighGrowthSection from '@/components/screener/sections/HighGrowthSection'
import ThemeSection from '@/components/screener/sections/ThemeSection'
import PredictedReturnSection from '@/components/screener/sections/PredictedReturnSection'
import {
  loadIndicators, loadFundamentals, loadUpdatedAt,
  loadSectors, loadPatternStats
} from '@/lib/dataLoader'
import { strings } from '@/lib/strings/ko'
import type {
  IndicatorsJson, FundamentalsJson, SectorsJson, PatternStatsJson
} from '@/lib/types/indicators'

interface Props { basePath: string }

export default function BeginnerContent({ basePath: propBasePath }: Props) {
  const params = useParams()
  const basePath = (params?.basePath as string) || propBasePath || ''
  const [indicators, setIndicators] = useState<IndicatorsJson | null>(null)
  const [fundamentals, setFundamentals] = useState<FundamentalsJson>({})
  const [sectors, setSectors] = useState<SectorsJson | null>(null)
  const [patternStats, setPatternStats] = useState<PatternStatsJson | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) { setLoading(false); return }
      const [ind, fund, sec, ps] = await Promise.all([
        loadIndicators(u.trade_date),
        loadFundamentals(u.trade_date),
        loadSectors(u.trade_date),
        loadPatternStats(u.trade_date)
      ])
      setIndicators(ind)
      setFundamentals(fund ?? {})
      setSectors(sec)
      setPatternStats(ps)
      setLoading(false)
    })
  }, [])

  if (loading) return <p>{strings.common.loading}</p>
  if (!indicators) return <p>{strings.screener.empty}</p>

  return (
    <div className="space-y-12">
      <header className="mb-2">
        <h2 className="text-3xl font-bold">{strings.beginner.pageTitle}</h2>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-2">
          {strings.beginner.pageDesc}
        </p>
      </header>
      <TodayRecommendSection indicators={indicators} fundamentals={fundamentals} patternStats={patternStats} basePath={basePath} />
      <LongTermSection indicators={indicators} fundamentals={fundamentals} patternStats={patternStats} basePath={basePath} />
      <HighGrowthSection indicators={indicators} fundamentals={fundamentals} patternStats={patternStats} basePath={basePath} />
      <ThemeSection indicators={indicators} fundamentals={fundamentals} sectors={sectors} patternStats={patternStats} basePath={basePath} />
      <PredictedReturnSection indicators={indicators} patternStats={patternStats} basePath={basePath} />
      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark pt-8 border-t border-border-light dark:border-border-dark">
        * 모든 예측 수익률은 과거 통계 기반 참고치이며, 미래 수익을 보장하지 않습니다.
      </p>
    </div>
  )
}
