export interface PortfolioEntry {
  id: string
  code: string
  buyPrice: number
  quantity: number
  boughtAt: string  // ISO date
  memo?: string
}

export interface PortfolioStore {
  entries: PortfolioEntry[]
}

export interface PortfolioTotals {
  totalCost: number
  totalValue: number
  totalProfit: number
  totalReturnPct: number
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function emptyPortfolio(): PortfolioStore {
  return { entries: [] }
}

export function addPortfolioEntry(
  store: PortfolioStore,
  fields: Omit<PortfolioEntry, 'id'>
): PortfolioStore {
  return { entries: [...store.entries, { ...fields, id: uuid() }] }
}

export function updatePortfolioEntry(
  store: PortfolioStore,
  id: string,
  patch: Partial<Omit<PortfolioEntry, 'id'>>
): PortfolioStore {
  return {
    entries: store.entries.map((e) => (e.id === id ? { ...e, ...patch } : e))
  }
}

export function removePortfolioEntry(
  store: PortfolioStore,
  id: string
): PortfolioStore {
  return { entries: store.entries.filter((e) => e.id !== id) }
}

export function computeTotals(
  store: PortfolioStore,
  prices: Record<string, number>
): PortfolioTotals {
  let totalCost = 0
  let totalValue = 0
  for (const e of store.entries) {
    const cost = e.buyPrice * e.quantity
    const cur = prices[e.code] ?? e.buyPrice
    totalCost += cost
    totalValue += cur * e.quantity
  }
  const totalProfit = totalValue - totalCost
  const totalReturnPct = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0
  return { totalCost, totalValue, totalProfit, totalReturnPct }
}
