'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import RecommendCard from '@/components/screener/RecommendCard'
import { getBeginnerPresets } from '@/lib/presets/registry'
import { runPreset, type FilterResult } from '@/lib/filter'
import { loadIndicators, loadFundamentals, loadUpdatedAt } from '@/lib/dataLoader'
import { strings } from '@/lib/strings/ko'

interface TaggedResult extends FilterResult {
  presetId: string
  tagLabel: string
}

export default function BeginnerScreener() {
  const params = useParams()
  const basePath = (params?.basePath as string) || ''
  const [results, setResults] = useState<TaggedResult[]>([])
  const [loading, setLoading] = useState(true)

  const presets = useMemo(() => getBeginnerPresets(), [])

  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) { setLoading(false); return }
      const [ind, fund] = await Promise.all([
        loadIndicators(u.trade_date),
        loadFundamentals(u.trade_date)
      ])
      if (!ind) { setLoading(false); return }
      const tagged: TaggedResult[] = []
      for (const preset of presets) {
        const res = runPreset(preset, ind, fund ?? {}, {})
        for (const r of res) {
          tagged.push({ ...r, presetId: preset.id, tagLabel: preset.description.beginner })
        }
      }
      const seen = new Set<string>()
      const dedup = tagged.filter((r) => {
        if (seen.has(r.code)) return false
        seen.add(r.code)
        return true
      })
      setResults(dedup.slice(0, 24))
      setLoading(false)
    })
  }, [presets])

  if (loading) return <p>{strings.common.loading}</p>
  if (results.length === 0) return <p>{strings.screener.empty}</p>

  return (
    <>
      <h2 className="text-lg font-bold mb-4">{strings.screener.beginnerTitle}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((r) => (
          <RecommendCard key={r.code} result={r} tagLabel={r.tagLabel} basePath={basePath} />
        ))}
      </div>
    </>
  )
}
