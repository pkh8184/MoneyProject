'use client'
import { useState } from 'react'
import { strings } from '@/lib/strings/ko'

export interface GuideStep {
  title: string
  body: string
}

interface Props {
  steps: GuideStep[]
  onDismiss: (persist: boolean) => void
}

export default function FirstVisitGuide({ steps, onDismiss }: Props) {
  const [idx, setIdx] = useState(0)
  const [persist, setPersist] = useState(false)
  const isLast = idx === steps.length - 1
  const step = steps[idx]

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-bg-primary-light dark:bg-bg-primary-dark rounded-2xl shadow-soft-md p-6 max-w-sm w-full">
        <h2 className="text-lg font-bold mb-3">{step.title}</h2>
        <p className="text-sm leading-relaxed mb-5 whitespace-pre-line">{step.body}</p>

        {/* dots */}
        <div className="flex gap-1 mb-5" aria-hidden>
          {steps.map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full ${
                i === idx ? 'bg-accent-light dark:bg-accent-dark' : 'bg-bg-secondary-light dark:bg-bg-secondary-dark'
              }`}
            />
          ))}
        </div>

        {isLast && (
          <label className="flex items-center gap-2 mb-4 text-sm">
            <input
              type="checkbox"
              checked={persist}
              onChange={(e) => setPersist(e.target.checked)}
              aria-label={strings.firstVisit.dontShowAgain}
            />
            {strings.firstVisit.dontShowAgain}
          </label>
        )}

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => onDismiss(false)}
            className="px-4 py-2 text-sm text-text-secondary-light dark:text-text-secondary-dark"
          >
            {strings.firstVisit.skipButton}
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={() => onDismiss(persist)}
              className="px-4 py-2 text-sm rounded-full bg-accent-light dark:bg-accent-dark text-white"
            >
              {strings.firstVisit.startButton}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIdx((i) => Math.min(i + 1, steps.length - 1))}
              className="px-4 py-2 text-sm rounded-full bg-accent-light dark:bg-accent-dark text-white"
            >
              {strings.firstVisit.nextButton}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
