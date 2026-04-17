'use client'
import { useEffect, useState } from 'react'
import { loadMlMetrics, loadUpdatedAt } from '@/lib/dataLoader'
import { strings } from '@/lib/strings/ko'
import type { MLMetricsJson } from '@/lib/types/indicators'

export default function MlMetricsView() {
  const [data, setData] = useState<MLMetricsJson | null>(null)

  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) return
      const d = await loadMlMetrics(u.trade_date)
      setData(d)
    })
  }, [])

  if (!data) return <p className="text-sm">ML 모델 훈련 전입니다. Train ML Model 워크플로를 실행하세요.</p>

  return (
    <>
      <h1 className="text-xl font-bold mb-4">{strings.ml.metricsPageTitle}</h1>
      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">
        {strings.ml.metricsUpdated(data.trained_at)}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-4 rounded-2xl bg-bg-secondary-light dark:bg-bg-secondary-dark">
          <div className="text-sm">AUC (Test)</div>
          <div className="text-xl font-bold">{data.auc_test.toFixed(3)}</div>
        </div>
        <div className="p-4 rounded-2xl bg-bg-secondary-light dark:bg-bg-secondary-dark">
          <div className="text-sm">Top 10% Precision</div>
          <div className="text-xl font-bold">{(data.precision_top10 * 100).toFixed(1)}%</div>
        </div>
        <div className="p-4 rounded-2xl bg-bg-secondary-light dark:bg-bg-secondary-dark">
          <div className="text-sm">Lift</div>
          <div className="text-xl font-bold">{data.lift_top10.toFixed(2)}x</div>
        </div>
        <div className="p-4 rounded-2xl bg-bg-secondary-light dark:bg-bg-secondary-dark">
          <div className="text-sm">Samples</div>
          <div className="text-xl font-bold">{data.n_samples.toLocaleString()}</div>
        </div>
      </div>

      <h2 className="font-bold mb-3">피처 중요도 Top 15</h2>
      <ul className="space-y-1">
        {data.feature_importance_top15.map((f) => (
          <li key={f.name} className="flex justify-between text-sm">
            <span>{f.name}</span>
            <span className="font-mono">{f.importance.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </>
  )
}
