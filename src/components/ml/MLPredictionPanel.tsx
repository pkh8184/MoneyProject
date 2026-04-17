'use client'
import Card from '@/components/ui/Card'
import { useMlPredictions } from '@/lib/ml/useMlPredictions'
import { strings } from '@/lib/strings/ko'

interface Props { code: string }

export default function MLPredictionPanel({ code }: Props) {
  const preds = useMlPredictions()
  if (!preds) return null
  const p = preds.predictions[code]
  if (!p) return null

  return (
    <Card padding="lg" className="mt-6">
      <h3 className="font-bold text-xl mb-3">{strings.ml.panelTitle}</h3>
      <p className="text-sm mb-1">{strings.ml.probabilityLabel(p.probability)}</p>
      <p className="text-base font-bold mb-4">{strings.ml.scoreLabel(p.ml_score)}</p>

      {p.top_features.length > 0 && (
        <>
          <div className="text-sm font-bold mb-2">{strings.ml.topFeaturesTitle}</div>
          <ul className="space-y-1 mb-4">
            {p.top_features.map((f) => (
              <li key={f.name} className="text-sm font-mono">
                {strings.ml.featureRow(f.name, f.value)}
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
        {preds.auc_holdout != null && strings.ml.modelInfo(preds.model_version, preds.auc_holdout)}
      </p>
      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-2">
        {strings.ml.disclaimer}
      </p>
    </Card>
  )
}
