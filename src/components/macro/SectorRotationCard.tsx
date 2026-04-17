'use client'
import Card from '@/components/ui/Card'
import { strings } from '@/lib/strings/ko'
import type { SectorRotationJson } from '@/lib/types/indicators'

interface Props { rotation: SectorRotationJson | null }

export default function SectorRotationCard({ rotation }: Props) {
  if (!rotation || rotation.sectors.length === 0) {
    return (
      <Card padding="md" className="mb-6">
        <p className="text-sm">{strings.macro.rotationNoData}</p>
      </Card>
    )
  }

  const strong = rotation.sectors.filter((s) => s.rank === 'strong').slice(0, 5)
  const weak = rotation.sectors.filter((s) => s.rank === 'weak').slice(0, 5).reverse()

  return (
    <Card padding="md" className="mb-6">
      <h3 className="font-bold mb-3">{strings.macro.rotationTitle}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="text-sm font-bold mb-2">{strings.macro.rotationStrong}</div>
          <ul className="space-y-1 text-sm">
            {strong.map((s) => (
              <li key={s.theme} className="flex justify-between">
                <span>{s.theme}</span>
                <span className="text-emerald-600">{strings.macro.rotationRowPct(s.avg_return_pct)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-sm font-bold mb-2">{strings.macro.rotationWeak}</div>
          <ul className="space-y-1 text-sm">
            {weak.map((s) => (
              <li key={s.theme} className="flex justify-between">
                <span>{s.theme}</span>
                <span className="text-red-600">{strings.macro.rotationRowPct(s.avg_return_pct)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  )
}
