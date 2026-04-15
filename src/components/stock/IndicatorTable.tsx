import type { StockIndicators } from '@/lib/types/indicators'

export default function IndicatorTable({ stock }: { stock: StockIndicators }) {
  const last = <T,>(arr: (T | null)[]): T | null => arr.at(-1) ?? null
  const row = (label: string, value: string | number | null) => (
    <tr className="border-b border-border-light dark:border-border-dark" key={label}>
      <td className="py-1 pr-4 text-text-secondary-light dark:text-text-secondary-dark">{label}</td>
      <td className="py-1 text-right font-mono text-xs">{value ?? '-'}</td>
    </tr>
  )
  const fmt = (n: number | null) => n == null ? null : n.toLocaleString()
  const fmt1 = (n: number | null) => n == null ? null : n.toFixed(1)
  return (
    <table className="w-full text-sm">
      <tbody>
        {row('MA5', fmt(last(stock.ma5)))}
        {row('MA20', fmt(last(stock.ma20)))}
        {row('MA60', fmt(last(stock.ma60)))}
        {row('MA120', fmt(last(stock.ma120)))}
        {row('RSI14', fmt1(last(stock.rsi14)))}
        {row('MACD Line', fmt1(last(stock.macd_line)))}
        {row('MACD Signal', fmt1(last(stock.macd_signal)))}
        {row('MACD Hist', fmt1(last(stock.macd_hist)))}
        {row('BB Upper', fmt(last(stock.bb_upper)))}
        {row('BB Middle', fmt(last(stock.bb_middle)))}
        {row('BB Lower', fmt(last(stock.bb_lower)))}
        {row('52주 신고가', fmt(stock.high52w))}
        {row('거래량 20일 평균', fmt(stock.vol_avg20))}
      </tbody>
    </table>
  )
}
