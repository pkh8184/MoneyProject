'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import { useMacroFactors } from '@/lib/macro/useMacroFactors'
import { computeMacroBonus } from '@/lib/macro/scoring'
import { computeSectorRotationBonus } from '@/lib/macro/sectorRotation'
import { strings } from '@/lib/strings/ko'
import { loadStockMacroResponse, loadSectorRotation, loadUpdatedAt } from '@/lib/dataLoader'
import type { StockMacroResponseJson, SectorRotationJson } from '@/lib/types/indicators'

interface Props {
  stockName: string
  themes: string[] | undefined
  basePath: string
  code?: string
}

export default function MacroDetailPanel({ stockName, themes, basePath, code }: Props) {
  const { activeFactors, activatedAt } = useMacroFactors()
  const [responseDb, setResponseDb] = useState<StockMacroResponseJson | null>(null)
  const [rotation, setRotation] = useState<SectorRotationJson | null>(null)

  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) return
      const [r, rot] = await Promise.all([
        loadStockMacroResponse(u.trade_date),
        loadSectorRotation(u.trade_date)
      ])
      setResponseDb(r)
      setRotation(rot)
    })
  }, [])

  const sectorRotation = computeSectorRotationBonus(themes, rotation)

  if (activeFactors.length === 0 && sectorRotation.sectorRotationDelta === 0) return null

  const bonus = computeMacroBonus(stockName, themes, activeFactors, activatedAt)
  const total = bonus.total + sectorRotation.sectorRotationDelta

  return (
    <Card padding="lg" className="mt-6">
      <h3 className="font-bold text-xl mb-3">{strings.macro.detailTitle}</h3>
      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">
        {strings.macro.matchSummary(bonus.detail.length, activeFactors.length)}
      </p>

      {bonus.detail.length > 0 || sectorRotation.sectorRotationDelta !== 0 ? (
        <div className="space-y-2">
          {bonus.detail.map((d) => {
            const stockResp = code ? responseDb?.stocks[code]?.[d.factorId] : null
            return (
              <div
                key={d.factorId}
                className="p-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">
                    {d.role === 'benefit' ? '🟢' : '🔴'} {d.factorName}
                  </span>
                  <span className={`font-bold ${d.delta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {d.delta > 0 ? '+' : ''}
                    {d.delta} {d.role === 'benefit' ? strings.macro.roleBenefit : strings.macro.roleLoss}
                  </span>
                </div>
                {stockResp && stockResp.avg_return_d5 != null ? (
                  <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
                    📊 이 종목은 과거 평균 D+5 {stockResp.avg_return_d5 > 0 ? '+' : ''}
                    {stockResp.avg_return_d5.toFixed(2)}% ({stockResp.sample_days}일)
                  </div>
                ) : null}
              </div>
            )
          })}
          {sectorRotation.sectorRotationDelta !== 0 && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark">
              <span className="text-sm">
                ⚡ 섹터 로테이션 {sectorRotation.rank === 'strong' ? '🔥' : '❄️'} ({sectorRotation.activeSector})
              </span>
              <span className={`font-bold ${sectorRotation.sectorRotationDelta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {sectorRotation.sectorRotationDelta > 0 ? '+' : ''}{sectorRotation.sectorRotationDelta}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-light dark:border-border-dark">
            <span className="font-bold">{strings.macro.totalLine}</span>
            <span
              className={`font-bold text-lg ${
                total > 0 ? 'text-emerald-600' : total < 0 ? 'text-red-600' : ''
              }`}
            >
              {total > 0 ? '+' : ''}
              {total}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
          매칭된 팩터가 없어요
        </p>
      )}

      <Link
        href={`/${basePath}/environment`}
        className="inline-block mt-4 text-sm underline"
      >
        {strings.macro.goToSettings}
      </Link>
    </Card>
  )
}
