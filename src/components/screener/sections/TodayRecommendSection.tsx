'use client'

import { useMemo } from 'react'
import StockCardWithPrediction from '@/components/screener/StockCardWithPrediction'
import { getBeginnerPresets } from '@/lib/presets/registry'
import { runPreset, type FilterResult } from '@/lib/filter'
import type { IndicatorsJson, FundamentalsJson, PatternStatsJson } from '@/lib/types/indicators'

interface Props {
  indicators: IndicatorsJson | null
  fundamentals: FundamentalsJson
  patternStats: PatternStatsJson | null
  basePath: string
}

export default function TodayRecommendSection({ indicators, fundamentals, patternStats, basePath }: Props) {
  const results = useMemo(() => {
    if (!indicators) return []
    const presets = getBeginnerPresets()
    const collected: Array<FilterResult & { tagLabel: string }> = []
    for (const preset of presets) {
      const out = runPreset(preset, indicators, fundamentals, {})
      for (const r of out) {
        collected.push({ ...r, tagLabel: preset.description.beginner })
      }
    }
    const seen = new Set<string>()
    return collected.filter((r) => {
      if (seen.has(r.code)) return false
      seen.add(r.code)
      // 과거 통계가 충분한 종목 중 기대수익 음수 또는 신뢰 40% 미만은 추천에서 제외
      // D+14 우선, 없으면 D+7 사용 (워크플로 재실행 전 호환)
      const stats = patternStats?.by_stock_preset?.[r.code]?.volume_spike
      const horizon = stats?.d14 ?? stats?.d7
      if (stats && stats.sample_count >= 5 && horizon) {
        if (horizon.avg < 0) return false
        if (horizon.win_rate < 40) return false
      }
      return true
    }).slice(0, 6)
  }, [indicators, fundamentals, patternStats])

  if (results.length === 0) return null
  return (
    <section>
      <header className="mb-6">
        <h2 className="text-2xl font-bold">📌 오늘의 추천 종목</h2>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
          오늘 사기 좋은 신호가 발생한 종목
        </p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {results.map((r) => (
          <StockCardWithPrediction
            key={r.code}
            result={r}
            tagLabel={r.tagLabel}
            stats={patternStats?.by_stock_preset?.[r.code]?.volume_spike}
            basePath={basePath}
          />
        ))}
      </div>
    </section>
  )
}
