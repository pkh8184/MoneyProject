'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  loadIndicators,
  loadFundamentals,
  loadUpdatedAt,
  loadOhlcvForCode,
  loadSectors,
  loadPatternStats,
  loadSectorRotation,
  type SingleStockOhlcv
} from '@/lib/dataLoader'
import { strings } from '@/lib/strings/ko'
import StockChart from '@/components/stock/StockChart'
import IndicatorTable from '@/components/stock/IndicatorTable'
import FundamentalTable from '@/components/stock/FundamentalTable'
import MatchedPresets from '@/components/stock/MatchedPresets'
import BowlVolumePanel from '@/components/stock/BowlVolumePanel'
import BowlPhaseIndicator from '@/components/stock/BowlPhaseIndicator'
import WatchlistButton from '@/components/stock/WatchlistButton'
import StockMomentumPanel from '@/components/stock/StockMomentumPanel'
import MacroDetailPanel from '@/components/macro/MacroDetailPanel'
import MLPredictionPanel from '@/components/ml/MLPredictionPanel'
import { allPresets } from '@/lib/presets/registry'
import { computeMacroBonus } from '@/lib/macro/scoring'
import { computeSectorRotationBonus } from '@/lib/macro/sectorRotation'
import { useMacroFactors } from '@/lib/macro/useMacroFactors'
import { useMlPredictions } from '@/lib/ml/useMlPredictions'
import { PANEL_ANCHORS } from '@/lib/stockMomentum/types'
import type {
  StockIndicators,
  Fundamental,
  SectorsJson,
  PatternStatsJson,
  SectorRotationJson
} from '@/lib/types/indicators'

interface Props { code: string; basePath: string }

export default function StockDetail({ code, basePath }: Props) {
  const [stock, setStock] = useState<StockIndicators | null>(null)
  const [fundamental, setFundamental] = useState<Fundamental | undefined>(undefined)
  const [ohlcvFull, setOhlcvFull] = useState<SingleStockOhlcv | null>(null)
  const [sectors, setSectors] = useState<SectorsJson | null>(null)
  const [patternStats, setPatternStats] = useState<PatternStatsJson | null>(null)
  const [rotation, setRotation] = useState<SectorRotationJson | null>(null)
  const [loading, setLoading] = useState(true)
  const { activeFactors } = useMacroFactors()
  const mlPreds = useMlPredictions()

  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) { setLoading(false); return }
      const [ind, fund, ohlcv, sec, ps, rot] = await Promise.all([
        loadIndicators(u.trade_date),
        loadFundamentals(u.trade_date),
        loadOhlcvForCode(u.trade_date, code),
        loadSectors(u.trade_date),
        loadPatternStats(u.trade_date),
        loadSectorRotation(u.trade_date)
      ])
      const s = ind?.[code] as StockIndicators | undefined
      setStock(s ?? null)
      setFundamental(fund?.[code])
      setOhlcvFull(ohlcv)
      setSectors(sec)
      setPatternStats(ps)
      setRotation(rot)
      setLoading(false)
    })
  }, [code])

  const themes = sectors?.[code]?.themes
  const macroBonus = useMemo(
    () =>
      activeFactors.length > 0 && stock
        ? computeMacroBonus(stock.name, themes, activeFactors)
        : undefined,
    [stock, themes, activeFactors]
  )
  const sectorRotationBonus = useMemo(
    () => (rotation && themes ? computeSectorRotationBonus(themes, rotation) : undefined),
    [themes, rotation]
  )
  const mlPrediction = mlPreds?.predictions[code]
  const matchedPresetIds = useMemo(() => {
    if (!stock) return []
    const ids: string[] = []
    for (const p of allPresets) {
      try {
        if (p.filter({ stock, fundamental, params: {} })) ids.push(p.id)
      } catch {}
    }
    return ids
  }, [stock, fundamental])

  if (loading) return <p>{strings.common.loading}</p>
  if (!stock) return (
    <>
      <Link href={`/${basePath}/screener`} className="text-sm text-accent-light dark:text-accent-dark">
        {strings.stock.backToScreener}
      </Link>
      <p className="mt-4">{strings.stock.notFound}</p>
    </>
  )

  const price = stock.close.at(-1)
  const prev = stock.close.at(-2)
  const change = price != null && prev != null ? price - prev : 0
  const changePct = price != null && prev != null && prev !== 0 ? (change / prev) * 100 : 0
  const changeClass = change >= 0 ? 'text-positive-light dark:text-positive-dark' : 'text-negative-light dark:text-negative-dark'

  return (
    <div>
      <Link href={`/${basePath}/screener`} className="text-sm text-accent-light dark:text-accent-dark">
        {strings.stock.backToScreener}
      </Link>

      <header className="mt-6 mb-8">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">{stock.name}</h1>
          <WatchlistButton code={code} />
        </div>
        <p className="text-base text-text-secondary-light dark:text-text-secondary-dark mt-1">
          {code} · {stock.market}
        </p>
        <div className="flex items-baseline gap-3 mt-3">
          <p className="text-hero">{price?.toLocaleString() ?? '-'}원</p>
          {price != null && prev != null && (
            <p className={`text-lg font-bold ${changeClass}`}>
              {change >= 0 ? '+' : ''}{change.toLocaleString()} ({changePct.toFixed(2)}%)
            </p>
          )}
        </div>
      </header>

      <StockMomentumPanel
        stock={stock}
        ohlcvFull={ohlcvFull ?? undefined}
        fundamental={fundamental}
        macroBonus={macroBonus}
        sectorRotation={sectorRotationBonus}
        mlPrediction={mlPrediction}
        patternStats={patternStats?.by_stock_preset?.[code]}
        matchedPresetIds={matchedPresetIds}
      />

      <section className="mb-8 mt-8">
        <StockChart stock={stock} ohlcvFull={ohlcvFull} />
      </section>

      <section className="mt-10">
        <h3 className="text-xl font-bold mb-4">{strings.stock.indicators}</h3>
        <IndicatorTable stock={stock} />
      </section>
      <section className="mt-10">
        <h3 className="text-xl font-bold mb-4">{strings.stock.fundamentals} · {strings.stock.supply}</h3>
        <FundamentalTable fundamental={fundamental} />
      </section>
      <section id={PANEL_ANCHORS.matchedPresets} className="mt-10">
        <h3 className="text-xl font-bold mb-4">{strings.stock.matchedPresets}</h3>
        <MatchedPresets stock={stock} fundamental={fundamental} />
      </section>
      <section id={PANEL_ANCHORS.bowlPhase}>
        <BowlPhaseIndicator stock={stock} />
      </section>
      <section id={PANEL_ANCHORS.bowlVolume}>
        <BowlVolumePanel stock={stock} fundamental={fundamental} />
      </section>
      <section id={PANEL_ANCHORS.macroDetail}>
        <MacroDetailPanel stockName={stock.name} themes={themes} basePath={basePath} code={code} />
      </section>
      <section id={PANEL_ANCHORS.mlPrediction}>
        <MLPredictionPanel code={code} />
      </section>
    </div>
  )
}
