'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { allPresets } from '@/lib/presets/registry'
import { groupByCategory, CATEGORY_META } from '@/lib/presets/categories'
import { runPreset, enrichWithMacro, enrichWithMl } from '@/lib/filter'
import {
  loadIndicators, loadFundamentals, loadSectors, loadUpdatedAt, loadSectorRotation, loadPatternStats
} from '@/lib/dataLoader'
import { strings } from '@/lib/strings/ko'
import type {
  IndicatorsJson, FundamentalsJson, SectorsJson, SectorRotationJson, PatternStatsJson
} from '@/lib/types/indicators'
import { useMacroFactors } from '@/lib/macro/useMacroFactors'
import { useMlPredictions } from '@/lib/ml/useMlPredictions'
import { computeMacroBonus } from '@/lib/macro/scoring'
import { computeSectorRotationBonus, type SectorRotationBonus } from '@/lib/macro/sectorRotation'
import type { MacroBonus } from '@/lib/macro/types'
import type { MLPrediction } from '@/lib/types/indicators'
import MacroBadge from '@/components/macro/MacroBadge'
import MLScoreBadge from '@/components/ml/MLScoreBadge'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Pill from '@/components/ui/Pill'
import GaugeBar from '@/components/ui/GaugeBar'

interface Props { basePath: string }

interface AggRow {
  code: string
  name: string
  market: string
  price: number | null
  matchedIds: string[]
  matchedNames: string[]
  macroBonus?: MacroBonus
  sectorRotationBonus?: SectorRotationBonus
  mlPrediction?: MLPrediction
  expectedReturn?: number | null
  expectedWinRate?: number | null
  horizonLabel?: string
}

const LS_KEY = 'recommendations-enabled-presets-v1'

// 기본 추천 프리셋 (겹침 최소화된 6개 core 시그널)
const DEFAULT_RECOMMENDED_IDS = [
  'combo_golden',
  'combo_value_rebound',
  'bowl_pattern',
  'safe_large_cap',
  'prev_high_break',
  'v_shape_rebound'
]

function loadEnabledFromStorage(fallback: string[]): Set<string> {
  if (typeof window === 'undefined') return new Set(fallback)
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return new Set(fallback)
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return new Set(fallback)
    return new Set(arr.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set(fallback)
  }
}

export default function RecommendationsList({ basePath }: Props) {
  const [indicators, setIndicators] = useState<IndicatorsJson | null>(null)
  const [fundamentals, setFundamentals] = useState<FundamentalsJson>({})
  const [sectors, setSectors] = useState<SectorsJson | null>(null)
  const [rotation, setRotation] = useState<SectorRotationJson | null>(null)
  const [patternStats, setPatternStats] = useState<PatternStatsJson | null>(null)
  const [loading, setLoading] = useState(true)
  const [minMatches, setMinMatches] = useState(2)
  const [showFilters, setShowFilters] = useState(false)
  const { activeFactors } = useMacroFactors()
  const mlPreds = useMlPredictions()

  const allIds = useMemo(() => allPresets.map((p) => p.id), [])
  const [enabledIds, setEnabledIds] = useState<Set<string>>(
    () => new Set(DEFAULT_RECOMMENDED_IDS)
  )

  useEffect(() => {
    setEnabledIds(loadEnabledFromStorage(DEFAULT_RECOMMENDED_IDS))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(LS_KEY, JSON.stringify(Array.from(enabledIds)))
  }, [enabledIds])

  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) { setLoading(false); return }
      const [ind, fund, sec, rot, stats] = await Promise.all([
        loadIndicators(u.trade_date),
        loadFundamentals(u.trade_date),
        loadSectors(u.trade_date),
        loadSectorRotation(u.trade_date),
        loadPatternStats(u.trade_date)
      ])
      setIndicators(ind)
      setFundamentals(fund ?? {})
      setSectors(sec)
      setRotation(rot)
      setPatternStats(stats)
      setLoading(false)
    })
  }, [])

  const enabledPresets = useMemo(
    () => allPresets.filter((p) => enabledIds.has(p.id)),
    [enabledIds]
  )

  const rows = useMemo<AggRow[]>(() => {
    if (!indicators) return []
    const byCode = new Map<string, AggRow>()

    for (const preset of enabledPresets) {
      const raw = runPreset(preset, indicators, fundamentals, {})
      const results = enrichWithMl(enrichWithMacro(raw, sectors, activeFactors, rotation), mlPreds)
      for (const r of results) {
        const existing = byCode.get(r.code)
        if (existing) {
          existing.matchedIds.push(preset.id)
          existing.matchedNames.push(preset.name)
        } else {
          const themes = sectors?.[r.code]?.themes
          byCode.set(r.code, {
            code: r.code,
            name: r.name,
            market: r.market,
            price: r.price,
            matchedIds: [preset.id],
            matchedNames: [preset.name],
            macroBonus: activeFactors.length > 0
              ? computeMacroBonus(r.name, themes, activeFactors)
              : undefined,
            sectorRotationBonus: rotation
              ? computeSectorRotationBonus(themes, rotation)
              : undefined,
            mlPrediction: r.mlPrediction
          })
        }
      }
    }

    // 매칭된 프리셋들의 과거 D+14 통계 평균 계산 (없으면 D+7 폴백)
    const enriched: AggRow[] = []
    for (const row of byCode.values()) {
      const presetStats = patternStats?.by_stock_preset?.[row.code]
      let sumAvg = 0
      let sumWin = 0
      let count = 0
      let horizonLabel = 'D+14'
      let usedFallback = false
      for (const pid of row.matchedIds) {
        const s = presetStats?.[pid]
        if (!s || s.sample_count < 5) continue
        const h = s.d14 ?? s.d7
        if (!h) continue
        if (!s.d14) usedFallback = true
        sumAvg += h.avg
        sumWin += h.win_rate
        count++
      }
      if (count > 0) {
        row.expectedReturn = sumAvg / count
        row.expectedWinRate = sumWin / count
        row.horizonLabel = usedFallback ? 'D+7' : 'D+14'
      }
      // 음수 기대수익은 "오늘의 추천"에서 제외
      if (row.expectedReturn != null && row.expectedReturn < 0) continue
      enriched.push(row)
    }
    enriched.sort((a, b) => b.matchedIds.length - a.matchedIds.length)
    return enriched
  }, [indicators, fundamentals, sectors, rotation, activeFactors, enabledPresets, mlPreds, patternStats])

  const filtered = useMemo(
    () => rows.filter((r) => r.matchedIds.length >= minMatches),
    [rows, minMatches]
  )

  const togglePreset = (id: string) => {
    setEnabledIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleCategory = (ids: string[]) => {
    setEnabledIds((prev) => {
      const next = new Set(prev)
      const allOn = ids.every((id) => next.has(id))
      if (allOn) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }

  const selectAll = () => setEnabledIds(new Set(allIds))
  const selectNone = () => setEnabledIds(new Set())
  const selectDefault = () => setEnabledIds(new Set(DEFAULT_RECOMMENDED_IDS))

  if (loading) return <p>{strings.common.loading}</p>
  if (!indicators) return <p>{strings.screener.empty}</p>

  const grouped = groupByCategory(allPresets)

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-2xl font-bold">💡 구매 추천 일괄 뷰</h2>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
          선택된 {enabledPresets.length}개 전략 중 여러 개가 동시에 매칭된 종목. 기본은 겹침 적은 core 시그널 6개.
        </p>
      </header>

      {/* 🏆 TOP 5 리더보드 */}
      {filtered.length > 0 && (
        <section className="mb-10">
          <header className="mb-4">
            <h3 className="text-2xl font-bold">🏆 오늘의 TOP 5 추천</h3>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
              선택된 전략 중 매칭 수가 가장 많은 상위 5개 종목
            </p>
          </header>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {filtered.slice(0, 5).map((r, idx) => {
              const arrow = r.expectedReturn == null ? '⚖️' : r.expectedReturn > 0 ? '📈' : '📉'
              const winRate = r.expectedWinRate != null ? Math.round(r.expectedWinRate) : null
              return (
                <Link key={r.code} href={`/${basePath}/stock/${r.code}`} className="block">
                  <Card interactive padding="md" className="h-full relative">
                    <div className="absolute top-3 right-3 text-sm font-bold text-accent-light dark:text-accent-dark">
                      #{idx + 1}
                    </div>
                    <div className="font-bold text-base mb-1 pr-8 truncate">{r.name}</div>
                    <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-3 truncate">
                      {r.code} · {r.market}
                    </div>
                    <div className="font-bold text-lg mb-3">
                      {r.price?.toLocaleString() ?? '-'}원
                    </div>
                    <div className="mb-1 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                      매칭 {r.matchedIds.length}개
                    </div>
                    {r.expectedReturn != null ? (
                      <div className="mb-2 text-xs">
                        {arrow} {r.horizonLabel ?? 'D+14'} 예상 {r.expectedReturn > 0 ? '+' : ''}{r.expectedReturn.toFixed(2)}%
                        {winRate != null && <> · 승률 {winRate}%</>}
                      </div>
                    ) : (
                      <div className="mb-2 text-xs text-text-secondary-light dark:text-text-secondary-dark">과거 데이터 부족</div>
                    )}
                    <GaugeBar value={winRate ?? 0} max={100} />
                    {(r.macroBonus || r.mlPrediction) && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {r.macroBonus && <MacroBadge bonus={r.macroBonus} />}
                        {r.sectorRotationBonus && r.sectorRotationBonus.sectorRotationDelta !== 0 && (
                          <span className="text-xs">
                            {strings.macro.rotationBadge(r.sectorRotationBonus.sectorRotationDelta)}
                          </span>
                        )}
                        {r.mlPrediction && <MLScoreBadge prediction={r.mlPrediction} />}
                      </div>
                    )}
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <Card padding="md" className="mb-6">
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="w-full flex items-center justify-between"
        >
          <span className="text-base font-bold">
            🔘 전략 필터 ({enabledPresets.length}/{allPresets.length} 선택)
          </span>
          <span>{showFilters ? '▴' : '▾'}</span>
        </button>
        {showFilters && (
          <div className="mt-4 space-y-4">
            <div className="flex gap-2 flex-wrap items-center">
              <Button variant="secondary" size="sm" onClick={selectDefault}>기본 추천</Button>
              <Button variant="secondary" size="sm" onClick={selectAll}>전체 선택</Button>
              <Button variant="secondary" size="sm" onClick={selectNone}>전체 해제</Button>
              <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark ml-auto">
                해제된 전략은 매칭 점수에서 제외됩니다
              </span>
            </div>
            {grouped.map(({ category, items }) => {
              const meta = CATEGORY_META[category]
              const ids = items.map((p) => p.id)
              const allOn = ids.every((id) => enabledIds.has(id))
              return (
                <div key={category}>
                  <button
                    type="button"
                    onClick={() => toggleCategory(ids)}
                    className="text-sm font-bold mb-2 hover:underline"
                  >
                    {meta.icon} {meta.label} [{allOn ? '전체 해제' : '전체 선택'}]
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {items.map((p) => {
                      const on = enabledIds.has(p.id)
                      return (
                        <label
                          key={p.id}
                          className={`flex items-start gap-3 text-sm p-3 rounded-xl cursor-pointer ${
                            on ? 'bg-bg-primary-light dark:bg-bg-primary-dark shadow-soft' : 'opacity-60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => togglePreset(p.id)}
                            className="mt-0.5 w-5 h-5 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark truncate">
                              {p.shortFormula}
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">최소 매칭 수</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setMinMatches(n)}
            className={`text-sm px-4 py-2 rounded-full ${
              minMatches === n
                ? 'bg-accent-light dark:bg-accent-dark text-white'
                : 'bg-bg-secondary-light dark:bg-bg-secondary-dark hover:opacity-80'
            }`}
          >
            ≥ {n}
          </button>
        ))}
        <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark ml-auto">
          {filtered.length}개 종목
        </span>
      </div>

      {enabledPresets.length === 0 ? (
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
          선택된 전략이 없습니다. 필터 패널에서 1개 이상 선택해주세요.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
          조건에 맞는 종목이 없습니다. 최소 매칭 수를 낮춰보세요.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.slice(0, 200).map((r, idx) => {
            const arrow = r.expectedReturn == null ? '⚖️' : r.expectedReturn > 0 ? '📈' : '📉'
            const winRate = r.expectedWinRate != null ? Math.round(r.expectedWinRate) : null
            return (
              <Link key={r.code} href={`/${basePath}/stock/${r.code}`} className="block">
                <Card interactive padding="md">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="text-sm text-text-secondary-light dark:text-text-secondary-dark w-6">#{idx + 1}</div>
                      <div>
                        <div className="font-bold text-lg">{r.name}</div>
                        <div className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                          {r.code} · {r.market}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{r.price?.toLocaleString() ?? '-'}원</div>
                      <div className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                        매칭 {r.matchedIds.length}개
                      </div>
                      {(r.macroBonus || r.mlPrediction) && (
                        <div className="mt-1 flex justify-end items-center gap-1 flex-wrap">
                          {r.macroBonus && <MacroBadge bonus={r.macroBonus} />}
                          {r.sectorRotationBonus && r.sectorRotationBonus.sectorRotationDelta !== 0 && (
                            <span className="text-xs">
                              {strings.macro.rotationBadge(r.sectorRotationBonus.sectorRotationDelta)}
                            </span>
                          )}
                          {r.mlPrediction && <MLScoreBadge prediction={r.mlPrediction} />}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {r.matchedNames.slice(0, 4).map((name) => (
                      <Pill key={name}>{name}</Pill>
                    ))}
                    {r.matchedNames.length > 4 && (
                      <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark self-center">
                        외 {r.matchedNames.length - 4}개
                      </span>
                    )}
                  </div>

                  <div className="mt-4">
                    {r.expectedReturn != null ? (
                      <div className="flex items-center justify-between mb-1 text-sm">
                        <span>{arrow} {r.horizonLabel ?? 'D+14'} 예상 {r.expectedReturn > 0 ? '+' : ''}{r.expectedReturn.toFixed(2)}%</span>
                        <span className="font-bold">승률 {winRate ?? 0}%</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mb-1 text-sm">
                        <span className="text-text-secondary-light dark:text-text-secondary-dark">과거 데이터 부족</span>
                        <span className="text-text-secondary-light dark:text-text-secondary-dark">-</span>
                      </div>
                    )}
                    <GaugeBar value={winRate ?? 0} max={100} />
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {filtered.length > 200 && (
        <p className="mt-6 text-sm text-text-secondary-light dark:text-text-secondary-dark">
          상위 200개만 표시. 최소 매칭 수를 올려 좁혀보세요.
        </p>
      )}

      <p className="mt-8 text-sm text-text-secondary-light dark:text-text-secondary-dark">
        * 모든 추천은 과거 데이터 기반 기술적 신호이며, 미래 수익을 보장하지 않습니다. 투자 판단은 본인 책임입니다.
      </p>
    </div>
  )
}
