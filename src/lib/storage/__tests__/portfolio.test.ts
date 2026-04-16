import { describe, it, expect } from 'vitest'
import {
  type PortfolioStore,
  emptyPortfolio,
  addPortfolioEntry,
  updatePortfolioEntry,
  removePortfolioEntry,
  computeTotals
} from '../portfolio'

describe('portfolio storage', () => {
  it('emptyPortfolio returns empty', () => {
    expect(emptyPortfolio()).toEqual({ entries: [] })
  })

  it('addPortfolioEntry creates entry with id', () => {
    const store: PortfolioStore = { entries: [] }
    const next = addPortfolioEntry(store, {
      code: '005930', buyPrice: 70000, quantity: 10, boughtAt: '2026-04-01'
    })
    expect(next.entries).toHaveLength(1)
    expect(next.entries[0].id).toBeTruthy()
    expect(next.entries[0].code).toBe('005930')
  })

  it('updatePortfolioEntry replaces by id', () => {
    let store: PortfolioStore = { entries: [] }
    store = addPortfolioEntry(store, { code: '005930', buyPrice: 70000, quantity: 10, boughtAt: '2026-04-01' })
    const id = store.entries[0].id
    store = updatePortfolioEntry(store, id, { buyPrice: 71000 })
    expect(store.entries[0].buyPrice).toBe(71000)
    expect(store.entries[0].quantity).toBe(10)  // 변경되지 않은 필드 유지
  })

  it('removePortfolioEntry removes by id', () => {
    let store: PortfolioStore = { entries: [] }
    store = addPortfolioEntry(store, { code: '005930', buyPrice: 70000, quantity: 10, boughtAt: '2026-04-01' })
    store = addPortfolioEntry(store, { code: '000660', buyPrice: 100000, quantity: 5, boughtAt: '2026-04-02' })
    const id = store.entries[0].id
    store = removePortfolioEntry(store, id)
    expect(store.entries).toHaveLength(1)
    expect(store.entries[0].code).toBe('000660')
  })

  it('computeTotals aggregates buy cost and value', () => {
    const store: PortfolioStore = {
      entries: [
        { id: 'a', code: '005930', buyPrice: 70000, quantity: 10, boughtAt: '2026-04-01' },
        { id: 'b', code: '000660', buyPrice: 100000, quantity: 5, boughtAt: '2026-04-02' }
      ]
    }
    const prices = { '005930': 73000, '000660': 105000 }
    const totals = computeTotals(store, prices)
    expect(totals.totalCost).toBe(70000 * 10 + 100000 * 5)  // 1,200,000
    expect(totals.totalValue).toBe(73000 * 10 + 105000 * 5) // 1,255,000
    expect(totals.totalProfit).toBe(55000)
    expect(totals.totalReturnPct).toBeCloseTo(4.583, 2)
  })

  it('computeTotals handles missing prices gracefully', () => {
    const store: PortfolioStore = {
      entries: [{ id: 'a', code: '999999', buyPrice: 50000, quantity: 2, boughtAt: '2026-04-01' }]
    }
    const totals = computeTotals(store, {})
    expect(totals.totalCost).toBe(100000)
    expect(totals.totalValue).toBe(100000)  // 가격 없으면 매수가로 대체
    expect(totals.totalProfit).toBe(0)
  })
})
