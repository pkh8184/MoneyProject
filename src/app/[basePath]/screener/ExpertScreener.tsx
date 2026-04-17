'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import PresetSidebar from '@/components/screener/PresetSidebar'
import ResultTable from '@/components/screener/ResultTable'
import ParamControls from '@/components/screener/ParamControls'
import PresetDescription from '@/components/screener/PresetDescription'
import Card from '@/components/ui/Card'
import { getExpertPresets, getPresetById } from '@/lib/presets/registry'
import { runPreset, enrichWithMacro, type FilterResult } from '@/lib/filter'
import { loadIndicators, loadFundamentals, loadSectors, loadUpdatedAt } from '@/lib/dataLoader'
import type { IndicatorsJson, FundamentalsJson, SectorsJson } from '@/lib/types/indicators'
import type { PresetParams } from '@/lib/presets/types'
import { useMacroFactors } from '@/lib/macro/useMacroFactors'

export default function ExpertScreener() {
  const routeParams = useParams()
  const basePath = (routeParams?.basePath as string) || ''
  const [indicators, setIndicators] = useState<IndicatorsJson | null>(null)
  const [fundamentals, setFundamentals] = useState<FundamentalsJson | null>(null)
  const [sectors, setSectors] = useState<SectorsJson | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [paramsByPreset, setParamsByPreset] = useState<Record<string, PresetParams>>({})
  const [results, setResults] = useState<FilterResult[]>([])
  const { activeFactors } = useMacroFactors()

  const presets = useMemo(() => getExpertPresets(), [])

  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) { setLoading(false); return }
      const [ind, fund, sec] = await Promise.all([
        loadIndicators(u.trade_date),
        loadFundamentals(u.trade_date),
        loadSectors(u.trade_date)
      ])
      setIndicators(ind)
      setFundamentals(fund ?? {})
      setSectors(sec)
      setLoading(false)
      if (presets.length > 0) setActiveId(presets[0].id)
    })
  }, [presets])

  const currentPreset = useMemo(
    () => activeId ? getPresetById(activeId) : null,
    [activeId]
  )

  useEffect(() => {
    if (!indicators || !fundamentals || !currentPreset) {
      setResults([])
      return
    }
    const params = paramsByPreset[currentPreset.id] ?? {}
    const out = runPreset(currentPreset, indicators, fundamentals, params)
    setResults(enrichWithMacro(out, sectors, activeFactors))
  }, [indicators, fundamentals, sectors, activeFactors, currentPreset, paramsByPreset])

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <PresetSidebar presets={presets} activeId={activeId} onSelect={setActiveId} />
      <section className="flex-1 min-w-0">
        {currentPreset ? (
          <>
            <Card padding="md" className="mb-6">
              <PresetDescription preset={currentPreset} />
              <ParamControls
                params={currentPreset.params}
                values={paramsByPreset[currentPreset.id] ?? {}}
                onChange={(next) => setParamsByPreset({ ...paramsByPreset, [currentPreset.id]: next })}
              />
            </Card>
            <ResultTable results={results} loading={loading} basePath={basePath} />
          </>
        ) : (
          <p>프리셋을 선택해 주세요.</p>
        )}
      </section>
    </div>
  )
}
