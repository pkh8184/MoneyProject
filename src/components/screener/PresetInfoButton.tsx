'use client'

import { useEffect, useState } from 'react'
import type { Preset } from '@/lib/presets/types'

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
        className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-border-light dark:border-border-dark text-[10px] text-text-secondary-light dark:text-text-secondary-dark hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark"
      >
        i
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-bg-primary-light dark:bg-bg-primary-dark rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 shadow-xl"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg">{preset.name}</h3>
                {preset.beta && (
                  <span className="inline-block text-[10px] px-1.5 py-0.5 bg-accent-light dark:bg-accent-dark text-white rounded mt-1">
                    BETA
                  </span>
                )}
              </div>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setOpen(false)}
                className="text-xl leading-none text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark"
              >
                ×
              </button>
            </div>

            {preset.formula ? (
              <div className="text-sm space-y-4">
                <p className="text-text-secondary-light dark:text-text-secondary-dark">
                  {preset.formula.summary}
                </p>

                <section>
                  <h4 className="font-bold mb-2">📐 필수 조건</h4>
                  <ol className="list-decimal pl-5 space-y-1 text-xs">
                    {preset.formula.baseConditions.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ol>
                </section>

                {preset.formula.bonusConditions && preset.formula.bonusConditions.length > 0 && (
                  <section>
                    <h4 className="font-bold mb-2">⭐ 가산 조건 (점수 보너스)</h4>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      {preset.formula.bonusConditions.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {preset.formula.reference && (
                  <section className="pt-3 border-t border-border-light dark:border-border-dark">
                    <h4 className="font-bold mb-1 text-xs">출처·참고</h4>
                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                      {preset.formula.reference}
                    </p>
                  </section>
                )}
              </div>
            ) : (
              <div className="text-sm space-y-2">
                <p>{preset.description.expert}</p>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-border-light dark:border-border-dark text-xs space-y-1 text-text-secondary-light dark:text-text-secondary-dark">
              <p><strong>매수 타이밍:</strong> {preset.buyTiming}</p>
              <p><strong>보유 기간:</strong> {preset.holdingPeriod}</p>
              <p><strong>손절 기준:</strong> {preset.stopLoss}</p>
              <p><strong>주의:</strong> {preset.traps}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
