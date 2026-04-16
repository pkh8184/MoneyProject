import { describe, it, expect } from 'vitest'
import {
  type WatchlistStore,
  emptyWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist
} from '../watchlist'

describe('watchlist storage', () => {
  it('emptyWatchlist returns initial state', () => {
    expect(emptyWatchlist()).toEqual({ entries: [] })
  })

  it('addToWatchlist appends entry with addedAt', () => {
    const store: WatchlistStore = { entries: [] }
    const next = addToWatchlist(store, '005930', '2026-04-16')
    expect(next.entries).toHaveLength(1)
    expect(next.entries[0]).toEqual({ code: '005930', addedAt: '2026-04-16' })
  })

  it('addToWatchlist is idempotent (same code not duplicated)', () => {
    let store: WatchlistStore = { entries: [] }
    store = addToWatchlist(store, '005930', '2026-04-16')
    store = addToWatchlist(store, '005930', '2026-04-17')
    expect(store.entries).toHaveLength(1)
    expect(store.entries[0].addedAt).toBe('2026-04-16') // 첫 추가일 유지
  })

  it('removeFromWatchlist removes by code', () => {
    let store: WatchlistStore = {
      entries: [
        { code: '005930', addedAt: '2026-04-16' },
        { code: '000660', addedAt: '2026-04-17' }
      ]
    }
    store = removeFromWatchlist(store, '005930')
    expect(store.entries).toHaveLength(1)
    expect(store.entries[0].code).toBe('000660')
  })

  it('isInWatchlist checks membership', () => {
    const store: WatchlistStore = { entries: [{ code: '005930', addedAt: '2026-04-16' }] }
    expect(isInWatchlist(store, '005930')).toBe(true)
    expect(isInWatchlist(store, '000660')).toBe(false)
  })
})
