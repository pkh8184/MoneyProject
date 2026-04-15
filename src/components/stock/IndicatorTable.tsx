import type { StockIndicators } from '@/lib/types/indicators'
import Card from '@/components/ui/Card'

function last<T>(arr: (T | null)[]): T | null {
  return arr.at(-1) ?? null
}
function fmt(n: number | null | undefined) {
  return n == null ? '-' : n.toLocaleString()
}
function fmt1(n: number | null | undefined) {
  return n == null ? '-' : n.toFixed(1)
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <Card padding="sm" className="!p-4">
    <div className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{label}</div>
    <div className="mt-1 text-base font-bold font-mono">{value}</div>
  </Card>
)

export default function IndicatorTable({ stock }: { stock: StockIndicators }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <Row label="MA5" value={fmt(last(stock.ma5))} />
      <Row label="MA20" value={fmt(last(stock.ma20))} />
      <Row label="MA60" value={fmt(last(stock.ma60))} />
      <Row label="MA120" value={fmt(last(stock.ma120))} />
      <Row label="RSI14" value={fmt1(last(stock.rsi14))} />
      <Row label="MACD" value={fmt1(last(stock.macd_line))} />
      <Row label="Signal" value={fmt1(last(stock.macd_signal))} />
      <Row label="Histogram" value={fmt1(last(stock.macd_hist))} />
      <Row label="BB Upper" value={fmt(last(stock.bb_upper))} />
      <Row label="BB Lower" value={fmt(last(stock.bb_lower))} />
      <Row label="52주 신고가" value={fmt(stock.high52w)} />
      <Row label="20일 평균 거래량" value={fmt(stock.vol_avg20)} />
    </div>
  )
}
