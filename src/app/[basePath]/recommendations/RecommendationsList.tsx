'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { allPresets } from '@/lib/presets/registry'
import { runPreset } from '@/lib/filter'
import {
  loadIndicators, loadFundamentals, loadUpdatedAt
} from '@/lib/dataLoader'
import { strings } from '@/lib/strings/ko'
import type {
  IndicatorsJson, FundamentalsJson, StockIndicators
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

export default function RecommendationsList({ basePath }: Props) {
  const [indicators, setIndicators] = useState<IndicatorsJson | null>(null)
  const [fundamentals, setFundamentals] = useState<FundamentalsJson>({})
  const [loading, setLoading] = useState(true)
  const [minMatches, setMinMatches] = useState(2)

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

  const rows = useMemo<AggRow[]>(() => {
    if (!indicators) return []
    const byCode = new Map<string, AggRow>()

    for (const preset of allPresets) {
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
  }, [indicators, fundamentals])

  const filtered = useMemo(
    () => rows.filter((r) => r.matchedIds.length >= minMatches),
    [rows, minMatches]
  )

  if (loading) return <p>{strings.common.loading}</p>
  if (!indicators) return <p>{strings.screener.empty}</p>

  return (
    <div>
      <header className="mb-4">
        <h2 className="text-xl font-bold">💡 구매 추천 일괄 뷰</h2>
        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
          20개 전략 중 여러 개가 동시에 매칭된 종목 순 정렬. 매칭 수가 많을수록 신뢰도가 높습니다.
        </p>
      </header>

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

      {filtered.length === 0 ? (
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
