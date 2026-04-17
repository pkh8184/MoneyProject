'use client'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import { useMacroFactors } from '@/lib/macro/useMacroFactors'
import { computeMacroBonus } from '@/lib/macro/scoring'
import { strings } from '@/lib/strings/ko'

interface Props {
  stockName: string
  themes: string[] | undefined
  basePath: string
}

export default function MacroDetailPanel({ stockName, themes, basePath }: Props) {
  const { activeFactors } = useMacroFactors()

  if (activeFactors.length === 0) return null

  const bonus = computeMacroBonus(stockName, themes, activeFactors)

  return (
    <Card padding="lg" className="mt-6">
      <h3 className="font-bold text-xl mb-3">{strings.macro.detailTitle}</h3>
      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">
        {strings.macro.matchSummary(bonus.detail.length, activeFactors.length)}
      </p>

      {bonus.detail.length > 0 ? (
        <div className="space-y-2">
          {bonus.detail.map((d) => (
            <div
              key={d.factorId}
              className="flex items-center justify-between p-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark"
            >
              <span className="text-sm">
                {d.role === 'benefit' ? '🟢' : '🔴'} {d.factorName}
              </span>
              <span className={`font-bold ${d.delta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {d.delta > 0 ? '+' : ''}
                {d.delta} {d.role === 'benefit' ? strings.macro.roleBenefit : strings.macro.roleLoss}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-light dark:border-border-dark">
            <span className="font-bold">{strings.macro.totalLine}</span>
            <span
              className={`font-bold text-lg ${
                bonus.total > 0 ? 'text-emerald-600' : bonus.total < 0 ? 'text-red-600' : ''
              }`}
            >
              {bonus.total > 0 ? '+' : ''}
              {bonus.total}
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
