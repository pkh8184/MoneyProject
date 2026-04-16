export interface JournalEntry {
  id: string
  date: string  // ISO 'YYYY-MM-DD'
  code: string
  type: 'buy' | 'sell'
  price: number
  quantity: number
  profit?: number  // 매도 시 사용자 직접 입력
  reason?: string
}

export interface JournalStore {
  entries: JournalEntry[]
}

export interface MonthlySummary {
  month: string         // 'YYYY-MM'
  totalCount: number
  buyCount: number
  sellCount: number
  winCount: number
  lossCount: number
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function emptyJournal(): JournalStore {
  return { entries: [] }
}

export function addJournalEntry(
  store: JournalStore,
  fields: Omit<JournalEntry, 'id'>
): JournalStore {
  return { entries: [...store.entries, { ...fields, id: uuid() }] }
}

export function updateJournalEntry(
  store: JournalStore,
  id: string,
  patch: Partial<Omit<JournalEntry, 'id'>>
): JournalStore {
  return {
    entries: store.entries.map((e) => (e.id === id ? { ...e, ...patch } : e))
  }
}

export function removeJournalEntry(
  store: JournalStore,
  id: string
): JournalStore {
  return { entries: store.entries.filter((e) => e.id !== id) }
}

export function computeMonthlySummary(
  store: JournalStore,
  month: string  // 'YYYY-MM'
): MonthlySummary {
  const inMonth = store.entries.filter((e) => e.date.startsWith(month))
  let buyCount = 0
  let sellCount = 0
  let winCount = 0
  let lossCount = 0
  for (const e of inMonth) {
    if (e.type === 'buy') buyCount++
    else {
      sellCount++
      if (typeof e.profit === 'number') {
        if (e.profit > 0) winCount++
        else if (e.profit < 0) lossCount++
      }
    }
  }
  return { month, totalCount: inMonth.length, buyCount, sellCount, winCount, lossCount }
}
