import type { Fundamental } from '@/lib/types/indicators'
import Card from '@/components/ui/Card'

export default function FundamentalTable({ fundamental }: { fundamental: Fundamental | undefined }) {
  if (!fundamental) {
    return <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">펀더멘털 데이터 없음</p>
  }
  const foreignTotal = fundamental.foreign_net.slice(-5).reduce((a, b) => a + b, 0)
  const instTotal = fundamental.institution_net.slice(-5).reduce((a, b) => a + b, 0)

  const Row = ({ label, value }: { label: string; value: string }) => (
    <Card padding="sm" className="!p-4">
      <div className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{label}</div>
      <div className="mt-1 text-base font-bold font-mono">{value}</div>
    </Card>
  )

  return (
    <div className="grid grid-cols-2 gap-3">
      <Row label="PBR" value={fundamental.pbr?.toFixed(2) ?? '-'} />
      <Row label="PER" value={fundamental.per?.toFixed(2) ?? '-'} />
      <Row label="시가총액" value={fundamental.market_cap.toLocaleString()} />
      <Row label="외국인 5일 누적" value={foreignTotal.toLocaleString()} />
      <Row label="기관 5일 누적" value={instTotal.toLocaleString()} />
    </div>
  )
}
