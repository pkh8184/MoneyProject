'use client'
import type { MLPrediction } from '@/lib/types/indicators'
import { strings } from '@/lib/strings/ko'

interface Props {
  prediction: MLPrediction
}

export default function MLScoreBadge({ prediction }: Props) {
  const score = prediction.ml_score
  if (score === 0) return null

  const color = score >= 20 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
    : score >= 15 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    : score >= 10 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    : 'bg-bg-secondary-light dark:bg-bg-secondary-dark text-text-secondary-light dark:text-text-secondary-dark'

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${color}`}>
      {strings.ml.badgeLabel(score)}
    </span>
  )
}
