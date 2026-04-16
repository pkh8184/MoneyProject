import type {
  IndicatorsJson,
  FundamentalsJson,
  SectorsJson,
  StockIndicators
} from '@/lib/types/indicators'

export interface SectorAggregate {
  sector: string
  totalMarketCap: number
  weightedReturnPct: number
  stockCodes: string[]
}

export function aggregateSectors(
  indicators: IndicatorsJson,
  fundamentals: FundamentalsJson,
  sectors: SectorsJson
): SectorAggregate[] {
  const buckets = new Map<string, { weightedSum: number; cap: number; codes: string[] }>()

  for (const [code, val] of Object.entries(indicators)) {
    if (code === 'meta') continue
    const s = val as StockIndicators
    if (!s.close || s.close.length < 2) continue
    const today = s.close.at(-1)
    const prev = s.close.at(-2)
    if (typeof today !== 'number' || typeof prev !== 'number' || prev <= 0) continue
    const ret = ((today - prev) / prev) * 100
    const cap = fundamentals[code]?.market_cap ?? 0
    if (cap <= 0) continue
    const sectorName = sectors[code]?.sector?.trim() || '미분류'
    const cur = buckets.get(sectorName) ?? { weightedSum: 0, cap: 0, codes: [] }
    cur.weightedSum += ret * cap
    cur.cap += cap
    cur.codes.push(code)
    buckets.set(sectorName, cur)
  }

  const out: SectorAggregate[] = []
  for (const [sector, b] of buckets) {
    out.push({
      sector,
      totalMarketCap: b.cap,
      weightedReturnPct: b.cap > 0 ? b.weightedSum / b.cap : 0,
      stockCodes: b.codes
    })
  }
  return out
}
