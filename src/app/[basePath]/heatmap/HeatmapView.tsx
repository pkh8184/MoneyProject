'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useFirstVisit } from '@/lib/storage/useFirstVisit'
import { aggregateSectors } from '@/lib/sectorAggregation'
import { loadIndicators, loadFundamentals, loadSectors, loadUpdatedAt } from '@/lib/dataLoader'
import type { IndicatorsJson, FundamentalsJson, SectorsJson, StockIndicators } from '@/lib/types/indicators'
import FirstVisitGuide from '@/components/common/FirstVisitGuide'
import SectorBar from './SectorBar'
import { strings } from '@/lib/strings/ko'

interface Props { basePath: string }

export default function HeatmapView({ basePath }: Props) {
  const [indicators, setIndicators] = useState<IndicatorsJson | null>(null)
  const [fundamentals, setFundamentals] = useState<FundamentalsJson | null>(null)
  const [sectors, setSectors] = useState<SectorsJson | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [firstVisit, markVisited] = useFirstVisit('heatmap')
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => { if (firstVisit) setShowGuide(true) }, [firstVisit])
  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) return
      const [ind, fund, sec] = await Promise.all([
        loadIndicators(u.trade_date),
        loadFundamentals(u.trade_date),
        loadSectors(u.trade_date)
      ])
      setIndicators(ind)
      setFundamentals(fund)
      setSectors(sec)
    })
  }, [])

  const aggregates = useMemo(() => {
    if (!indicators || !fundamentals || !sectors) return []
    return aggregateSectors(indicators, fundamentals, sectors)
      .filter((a) => a.sector !== '미분류')
  }, [indicators, fundamentals, sectors])

  const top5 = useMemo(() =>
    [...aggregates].sort((a, b) => b.weightedReturnPct - a.weightedReturnPct).slice(0, 5)
  , [aggregates])

  const bottom5 = useMemo(() =>
    [...aggregates].sort((a, b) => a.weightedReturnPct - b.weightedReturnPct).slice(0, 5)
  , [aggregates])

  const maxAbs = useMemo(() => {
    const all = [...top5, ...bottom5].map((a) => Math.abs(a.weightedReturnPct))
    return all.length > 0 ? Math.max(...all) : 1
  }, [top5, bottom5])

  const selectedStocks = useMemo(() => {
    if (!selected || !indicators) return []
    const agg = aggregates.find((a) => a.sector === selected)
    if (!agg) return []
    return agg.stockCodes
      .map((code) => {
        const s = indicators[code] as StockIndicators | undefined
        if (!s || !s.close || s.close.length < 2) return null
        const today = s.close.at(-1)!
        const prev = s.close.at(-2)!
        return { code, name: s.name, pct: ((today - prev) / prev) * 100, price: today }
      })
      .filter((x): x is { code: string; name: string; pct: number; price: number } => x !== null)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 20)
  }, [selected, aggregates, indicators])

  return (
    <>
      <h1 className="text-xl font-bold mb-2">{strings.heatmap.pageTitle}</h1>
      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">
        {strings.heatmap.pickHint}
      </p>

      {aggregates.length === 0 ? (
        <p>{strings.heatmap.empty}</p>
      ) : (
        <>
          <h2 className="font-bold mb-2">{strings.heatmap.topTitle}</h2>
          <div className="space-y-2 mb-6">
            {top5.map((a) => (
              <SectorBar
                key={a.sector}
                sector={a.sector}
                pct={a.weightedReturnPct}
                maxAbsPct={maxAbs}
                positive={a.weightedReturnPct >= 0}
                active={selected === a.sector}
                onClick={() => setSelected(a.sector === selected ? null : a.sector)}
              />
            ))}
          </div>

          <h2 className="font-bold mb-2">{strings.heatmap.bottomTitle}</h2>
          <div className="space-y-2 mb-6">
            {bottom5.map((a) => (
              <SectorBar
                key={a.sector}
                sector={a.sector}
                pct={a.weightedReturnPct}
                maxAbsPct={maxAbs}
                positive={a.weightedReturnPct >= 0}
                active={selected === a.sector}
                onClick={() => setSelected(a.sector === selected ? null : a.sector)}
              />
            ))}
          </div>

          {selected && (
            <div className="mt-4">
              <h2 className="font-bold mb-3">{strings.heatmap.selectedSectorTitle(selected)}</h2>
              <div className="space-y-1">
                {selectedStocks.map((s) => (
                  <Link
                    key={s.code}
                    href={`/${basePath}/stock/${s.code}`}
                    className="flex justify-between p-2 rounded-lg hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark"
                  >
                    <span>{s.name}</span>
                    <span className="flex gap-3 text-sm">
                      <span>{s.price.toLocaleString()}원</span>
                      <span className={s.pct >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                        {s.pct >= 0 ? '+' : ''}{s.pct.toFixed(2)}%
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showGuide && (
        <FirstVisitGuide
          steps={[
            { title: '🗺 오늘 잘 나가는 분야', body: '오늘 어떤 분야가 강한지/약한지 한눈에 보여요.' },
            { title: '사용 방법', body: '분야를 클릭하면 그 분야 종목들이 나와요.' },
            { title: '활용 팁', body: '매일 흐름이 바뀌니 자주 확인하세요. 강한 분야의 종목을 살펴보세요.' }
          ]}
          onDismiss={(persist) => {
            setShowGuide(false)
            if (persist) markVisited()
          }}
        />
      )}
    </>
  )
}
