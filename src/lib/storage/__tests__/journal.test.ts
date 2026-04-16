import { describe, it, expect } from 'vitest'
import {
  type JournalStore,
  emptyJournal,
  addJournalEntry,
  updateJournalEntry,
  removeJournalEntry,
  computeMonthlySummary
} from '../journal'

describe('journal storage', () => {
  it('emptyJournal returns empty', () => {
    expect(emptyJournal()).toEqual({ entries: [] })
  })

  it('addJournalEntry creates entry with id', () => {
    const store: JournalStore = { entries: [] }
    const next = addJournalEntry(store, {
      date: '2026-04-15', code: '005930', type: 'buy',
      price: 70000, quantity: 10
    })
    expect(next.entries).toHaveLength(1)
    expect(next.entries[0].id).toBeTruthy()
    expect(next.entries[0].type).toBe('buy')
  })

  it('updateJournalEntry replaces by id', () => {
    let store: JournalStore = { entries: [] }
    store = addJournalEntry(store, { date: '2026-04-15', code: '005930', type: 'buy', price: 70000, quantity: 10 })
    const id = store.entries[0].id
    store = updateJournalEntry(store, id, { price: 71000 })
    expect(store.entries[0].price).toBe(71000)
  })

  it('removeJournalEntry removes by id', () => {
    let store: JournalStore = { entries: [] }
    store = addJournalEntry(store, { date: '2026-04-15', code: '005930', type: 'buy', price: 70000, quantity: 10 })
    const id = store.entries[0].id
    store = removeJournalEntry(store, id)
    expect(store.entries).toHaveLength(0)
  })

  it('computeMonthlySummary counts trades by buy/sell + win/loss', () => {
    const store: JournalStore = {
      entries: [
        { id: '1', date: '2026-04-01', code: 'A', type: 'buy', price: 100, quantity: 10 },
        { id: '2', date: '2026-04-05', code: 'A', type: 'sell', price: 110, quantity: 10, profit: 100 },
        { id: '3', date: '2026-04-10', code: 'B', type: 'buy', price: 200, quantity: 5 },
        { id: '4', date: '2026-04-15', code: 'B', type: 'sell', price: 190, quantity: 5, profit: -50 },
        { id: '5', date: '2026-03-20', code: 'C', type: 'buy', price: 50, quantity: 20 } // 다른 달
      ]
    }
    const s = computeMonthlySummary(store, '2026-04')
    expect(s.totalCount).toBe(4)
    expect(s.buyCount).toBe(2)
    expect(s.sellCount).toBe(2)
    expect(s.winCount).toBe(1)
    expect(s.lossCount).toBe(1)
  })

  it('computeMonthlySummary excludes sells without profit field', () => {
    const store: JournalStore = {
      entries: [
        { id: '1', date: '2026-04-01', code: 'A', type: 'sell', price: 110, quantity: 10 } // profit 없음
      ]
    }
    const s = computeMonthlySummary(store, '2026-04')
    expect(s.sellCount).toBe(1)
    expect(s.winCount).toBe(0)
    expect(s.lossCount).toBe(0)
  })
})
