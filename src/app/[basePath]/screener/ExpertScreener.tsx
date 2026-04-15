'use client'

import { useEffect, useMemo, useState } from 'react'
import PresetSidebar from '@/components/screener/PresetSidebar'
import ResultTable from '@/components/screener/ResultTable'
import ParamControls from '@/components/screener/ParamControls'
import PresetDescription from '@/components/screener/PresetDescription'
import { getExpertPresets, getPresetById } from '@/lib/presets/registry'
import { runPreset, type FilterResult } from '@/lib/filter'
import { loadIndicators, loadFundamentals, loadUpdatedAt } from '@/lib/dataLoader'
import type { IndicatorsJson, FundamentalsJson } from '@/lib/types/indicators'
import type { PresetParams } from '@/lib/presets/types'

export default function ExpertScreener() {
  const [indicators, setIndicators] = useState<IndicatorsJson | null>(null)
  const [fundamentals, setFundamentals] = useState<FundamentalsJson | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [paramsByPreset, setParamsByPreset] = useState<Record<string, PresetParams>>({})
  const [results, setResults] = useState<FilterResult[]>([])

  const presets = useMemo(() => getExpertPresets(), [])

  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) { setLoading(false); return }
      const [ind, fund] = await Promise.all([
        loadIndicators(u.trade_date),
        loadFundamentals(u.trade_date)
      ])
      setIndicators(ind)
      setFundamentals(fund ?? {})
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
    setResults(out)
  }, [indicators, fundamentals, currentPreset, paramsByPreset])

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <PresetSidebar presets={presets} activeId={activeId} onSelect={setActiveId} />
      <section className="flex-1 min-w-0">
        {currentPreset ? (
          <>
            <h2 className="text-lg font-bold mb-2">{currentPreset.name}</h2>
            <PresetDescription preset={currentPreset} />
            <ParamControls
              params={currentPreset.params}
              values={paramsByPreset[currentPreset.id] ?? {}}
              onChange={(next) => setParamsByPreset({ ...paramsByPreset, [currentPreset.id]: next })}
            />
            <div className="mt-4">
              <ResultTable results={results} loading={loading} />
            </div>
          </>
        ) : (
          <p>프리셋을 선택해 주세요.</p>
        )}
      </section>
    </div>
  )
}
