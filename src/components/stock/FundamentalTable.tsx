import type { Fundamental } from '@/lib/types/indicators'

export default function FundamentalTable({ fundamental }: { fundamental: Fundamental | undefined }) {
  if (!fundamental) return <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">펀더멘털 데이터 없음</p>
  const foreignTotal = fundamental.foreign_net.slice(-5).reduce((a, b) => a + b, 0)
  const instTotal = fundamental.institution_net.slice(-5).reduce((a, b) => a + b, 0)
  const row = (label: string, value: string) => (
    <tr className="border-b border-border-light dark:border-border-dark" key={label}>
      <td className="py-1 pr-4 text-text-secondary-light dark:text-text-secondary-dark">{label}</td>
      <td className="py-1 text-right font-mono text-xs">{value}</td>
    </tr>
  )
  return (
    <table className="w-full text-sm">
      <tbody>
        {row('PBR', fundamental.pbr?.toFixed(2) ?? '-')}
        {row('PER', fundamental.per?.toFixed(2) ?? '-')}
        {row('시가총액', fundamental.market_cap.toLocaleString())}
        {row('외국인 5일 누적', foreignTotal.toLocaleString())}
        {row('기관 5일 누적', instTotal.toLocaleString())}
      </tbody>
    </table>
  )
}
