'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { allPresets } from '@/lib/presets/registry'
import { groupByCategory, CATEGORY_META } from '@/lib/presets/categories'
import { runPreset } from '@/lib/filter'
import {
  loadIndicators, loadFundamentals, loadUpdatedAt
} from '@/lib/dataLoader'
import { strings } from '@/lib/strings/ko'
import type {
  IndicatorsJson, FundamentalsJson
} from '@/lib/types/indicators'

interface Props { basePath: string }

interface AggRow {
  code: string
  name: string
  market: string
  price: number | null
  matchedIds: string[]
  matchedNames: string[]
}

const LS_KEY = 'recommendations-enabled-presets-v1'

function loadEnabledFromStorage(defaultIds: string[]): Set<string> {
  if (typeof window === 'undefined') return new Set(defaultIds)
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return new Set(defaultIds)
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return new Set(defaultIds)
    const valid = arr.filter((id) => defaultIds.includes(id))
    return new Set(valid.length > 0 ? valid : defaultIds)
  } catch {
    return new Set(defaultIds)
  }
}

export default function RecommendationsList({ basePath }: Props) {
  const [indicators, setIndicators] = useState<IndicatorsJson | null>(null)
  const [fundamentals, setFundamentals] = useState<FundamentalsJson>({})
  const [loading, setLoading] = useState(true)
  const [minMatches, setMinMatches] = useState(2)
  const [showFilters, setShowFilters] = useState(false)

  const allIds = useMemo(() => allPresets.map((p) => p.id), [])
  const [enabledIds, setEnabledIds] = useState<Set<string>>(
    () => new Set(allIds)
  )

  // localStorage 복원 (클라이언트 only)
  useEffect(() => {
    setEnabledIds(loadEnabledFromStorage(allIds))
  }, [allIds])

  // 변경 시 저장
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(LS_KEY, JSON.stringify(Array.from(enabledIds)))
  }, [enabledIds])

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
      const results = runPreset(preset, indicators, fundamentals, {})
      for (const r of results) {
        const existing = byCode.get(r.code)
        if (existing) {
          existing.matchedIds.push(preset.id)
          existing.matchedNames.push(preset.name)
        } else {
          byCode.set(r.code, {
            code: r.code,
            name: r.name,
            market: r.market,
            price: r.price,
            matchedIds: [preset.id],
            matchedNames: [preset.name]
          })
        }
      }
    }

    const all = Array.from(byCode.values())
    all.sort((a, b) => b.matchedIds.length - a.matchedIds.length)
    return all
  }, [indicators, fundamentals, enabledPresets])

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

  if (loading) return <p>{strings.common.loading}</p>
  if (!indicators) return <p>{strings.screener.empty}</p>

  const grouped = groupByCategory(enabledPresets.length === allPresets.length ? allPresets : allPresets)

  return (
    <div>
      <header className="mb-4">
        <h2 className="text-xl font-bold">💡 구매 추천 일괄 뷰</h2>
        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
          선택된 {enabledPresets.length}개 전략 중 여러 개가 동시에 매칭된 종목 순 정렬.
        </p>
      </header>

      {/* 필터 설정 패널 */}
      <div className="mb-4 border border-border-light dark:border-border-dark rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2 text-sm bg-bg-secondary-light dark:bg-bg-secondary-dark hover:opacity-80"
        >
          <span className="font-bold">
            🔘 전략 필터 ({enabledPresets.length}/{allPresets.length} 선택됨)
          </span>
          <span>{showFilters ? '▴' : '▾'}</span>
        </button>
        {showFilters && (
          <div className="p-4 space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs px-3 py-1 rounded-md border border-border-light dark:border-border-dark hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark"
              >
                전체 선택
              </button>
              <button
                type="button"
                onClick={selectNone}
                className="text-xs px-3 py-1 rounded-md border border-border-light dark:border-border-dark hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark"
              >
                전체 해제
              </button>
              <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark ml-auto self-center">
                해제된 전략은 매칭 점수에서 제외됩니다
              </span>
            </div>

            {grouped.map(({ category, items }) => {
              const meta = CATEGORY_META[category]
              const ids = items.map((p) => p.id)
              const allOn = ids.every((id) => enabledIds.has(id))
              const someOn = ids.some((id) => enabledIds.has(id))
              return (
                <div key={category}>
                  <button
                    type="button"
                    onClick={() => toggleCategory(ids)}
                    className="text-xs font-bold mb-2 hover:underline"
                  >
                    {meta.icon} {meta.label} [{allOn ? '전체 해제' : someOn ? '전체 선택' : '전체 선택'}]
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {items.map((p) => {
                      const on = enabledIds.has(p.id)
                      return (
                        <label
                          key={p.id}
                          className={`flex items-start gap-2 text-xs p-2 rounded-md border cursor-pointer ${
                            on
                              ? 'border-accent-light dark:border-accent-dark bg-bg-secondary-light dark:bg-bg-secondary-dark'
                              : 'border-border-light dark:border-border-dark opacity-60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => togglePreset(p.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{p.name}</div>
                            <div className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark truncate">
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
      </div>

      {/* 최소 매칭 수 + 결과 개수 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
          최소 매칭 수
        </span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setMinMatches(n)}
            className={`text-xs px-3 py-1 rounded-md border ${
              minMatches === n
                ? 'bg-accent-light dark:bg-accent-dark text-white border-transparent'
                : 'border-border-light dark:border-border-dark hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark'
            }`}
          >
            ≥ {n}
          </button>
        ))}
        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark ml-auto">
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border-light dark:border-border-dark">
              <tr className="text-left">
                <th className="py-2 pr-3 w-10">#</th>
                <th className="py-2 pr-3">종목</th>
                <th className="py-2 pr-3">시장</th>
                <th className="py-2 pr-3 text-right">현재가</th>
                <th className="py-2 pr-3 text-center w-16">매칭</th>
                <th className="py-2 pr-3">추천 이유 (매칭된 전략)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((r, idx) => (
                <tr
                  key={r.code}
                  className="border-b border-border-light dark:border-border-dark hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark"
                >
                  <td className="py-2 pr-3 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                    {idx + 1}
                  </td>
                  <td className="py-2 pr-3">
                    <Link
                      href={`/${basePath}/stock/${r.code}`}
                      className="font-bold hover:underline"
                    >
                      {r.name}
                    </Link>
                    <div className="font-mono text-xs text-text-secondary-light dark:text-text-secondary-dark">
                      {r.code}
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                    {r.market}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {r.price?.toLocaleString() ?? '-'}원
                  </td>
                  <td className="py-2 pr-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                      r.matchedIds.length >= 4
                        ? 'bg-positive-light dark:bg-positive-dark text-white'
                        : r.matchedIds.length >= 2
                        ? 'bg-accent-light dark:bg-accent-dark text-white'
                        : 'bg-bg-secondary-light dark:bg-bg-secondary-dark'
                    }`}>
                      {r.matchedIds.length}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex flex-wrap gap-1">
                      {r.matchedNames.slice(0, 4).map((name) => (
                        <span
                          key={name}
                          className="text-[10px] px-1.5 py-0.5 bg-bg-secondary-light dark:bg-bg-secondary-dark rounded"
                        >
                          {name}
                        </span>
                      ))}
                      {r.matchedNames.length > 4 && (
                        <span className="text-[10px] px-1.5 py-0.5 text-text-secondary-light dark:text-text-secondary-dark">
                          외 {r.matchedNames.length - 4}개
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 200 && (
            <p className="mt-4 text-xs text-text-secondary-light dark:text-text-secondary-dark">
              상위 200개만 표시. 최소 매칭 수를 올려 좁혀보세요.
            </p>
          )}
        </div>
      )}

      <p className="mt-6 text-xs text-text-secondary-light dark:text-text-secondary-dark">
        * 모든 추천은 과거 데이터 기반 기술적 신호이며, 미래 수익을 보장하지 않습니다. 투자 판단은 본인 책임입니다.
      </p>
    </div>
  )
}
