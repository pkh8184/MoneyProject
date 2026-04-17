'use client'
import { useEffect, useState } from 'react'
import { macroFactors } from '@/lib/macro/factors'
import { loadFactorBacktest, loadUpdatedAt } from '@/lib/dataLoader'
import type { FactorBacktestJson } from '@/lib/types/indicators'

export default function BacktestView() {
  const [data, setData] = useState<FactorBacktestJson | null>(null)

  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) return
      const bt = await loadFactorBacktest(u.trade_date)
      setData(bt)
    })
  }, [])

  if (!data) {
    return (
      <p className="text-sm">백테스트 데이터가 아직 없어요. 워크플로 실행 후 다시 확인해 주세요.</p>
    )
  }

  const rows = Object.values(data.factors).sort((a, b) => b.sample_dates - a.sample_dates)

  return (
    <>
      <h1 className="text-xl font-bold mb-2">📊 백테스트 결과 (과거 5년)</h1>
      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">
        업데이트: {new Date(data.updated_at).toLocaleString('ko-KR')}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-border-light dark:border-border-dark">
              <th className="py-2 pr-4">팩터</th>
              <th className="py-2 pr-4">샘플 일수</th>
              <th className="py-2 pr-4">신뢰도</th>
              <th className="py-2 pr-4">권장 weight</th>
              <th className="py-2 pr-4">수혜 D+5</th>
              <th className="py-2 pr-4">피해 D+5</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const meta = macroFactors.find((f) => f.id === r.factor_id)
              const d5 = r.by_hold?.d5
              return (
                <tr key={r.factor_id} className="border-b border-border-light dark:border-border-dark">
                  <td className="py-2 pr-4">{meta?.emoji} {meta?.name ?? r.factor_id}</td>
                  <td className="py-2 pr-4">{r.sample_dates}</td>
                  <td className="py-2 pr-4">
                    {r.confidence === 'high' ? '★★★★★' : r.confidence === 'medium' ? '★★★☆☆' : '★☆☆☆☆'}
                  </td>
                  <td className="py-2 pr-4 font-bold">{r.recommended_weight}</td>
                  <td className={`py-2 pr-4 ${d5?.effect_benefit != null && d5.effect_benefit > 0 ? 'text-emerald-600' : d5?.effect_benefit != null && d5.effect_benefit < 0 ? 'text-red-600' : ''}`}>
                    {d5?.effect_benefit != null
                      ? `${d5.effect_benefit > 0 ? '+' : ''}${d5.effect_benefit.toFixed(2)}%`
                      : '-'}
                  </td>
                  <td className={`py-2 pr-4 ${d5?.effect_loss != null && d5.effect_loss < 0 ? 'text-red-600' : ''}`}>
                    {d5?.effect_loss != null
                      ? `${d5.effect_loss > 0 ? '+' : ''}${d5.effect_loss.toFixed(2)}%`
                      : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
