'use client'

import { useEffect, useState } from 'react'
import type { Preset } from '@/lib/presets/types'
import Button from '@/components/ui/Button'
import Pill from '@/components/ui/Pill'

interface Props {
  preset: Preset
}

export default function PresetInfoButton({ preset }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('keydown', onKey)
      return () => document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        aria-label={`${preset.name} 공식 설명 보기`}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          setOpen(true)
        }}
        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm text-text-secondary-light dark:text-text-secondary-dark hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark"
      >
        ⓘ
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-bg-primary-light dark:bg-bg-primary-dark rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-8 shadow-soft-md"
          >
            <div className="mb-6">
              <h3 className="font-bold text-2xl">{preset.name}</h3>
              <div className="mt-2 flex gap-2">
                {preset.beta && <Pill>BETA</Pill>}
                {preset.params.length > 0 && <Pill>파라미터 조정 가능</Pill>}
              </div>
            </div>

            {preset.formula ? (
              <div className="space-y-6 text-base">
                <p className="text-text-secondary-light dark:text-text-secondary-dark leading-relaxed">
                  {preset.formula.summary}
                </p>

                <section>
                  <h4 className="font-bold mb-3 text-lg">필수 조건</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-sm leading-relaxed">
                    {preset.formula.baseConditions.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ol>
                </section>

                {preset.formula.bonusConditions && preset.formula.bonusConditions.length > 0 && (
                  <section>
                    <h4 className="font-bold mb-3 text-lg">가산 조건</h4>
                    <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed">
                      {preset.formula.bonusConditions.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {preset.formula.reference && (
                  <section className="pt-4 border-t border-border-light dark:border-border-dark">
                    <h4 className="font-bold mb-2 text-sm">출처·참고</h4>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark leading-relaxed">
                      {preset.formula.reference}
                    </p>
                  </section>
                )}
              </div>
            ) : (
              <p className="text-base">{preset.description.expert}</p>
            )}

            <div className="mt-6 pt-6 border-t border-border-light dark:border-border-dark grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><strong>매수 타이밍:</strong> {preset.buyTiming}</div>
              <div><strong>보유 기간:</strong> {preset.holdingPeriod}</div>
              <div><strong>손절 기준:</strong> {preset.stopLoss}</div>
              <div className="text-text-secondary-light dark:text-text-secondary-dark">
                <strong>주의:</strong> {preset.traps}
              </div>
            </div>

            <div className="mt-6">
              <Button variant="primary" size="lg" className="w-full" onClick={() => setOpen(false)}>
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
