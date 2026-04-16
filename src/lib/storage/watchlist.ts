export interface WatchlistEntry {
  code: string
  addedAt: string // ISO date 'YYYY-MM-DD'
}

export interface WatchlistStore {
  entries: WatchlistEntry[]
}

export function emptyWatchlist(): WatchlistStore {
  return { entries: [] }
}

export function isInWatchlist(store: WatchlistStore, code: string): boolean {
  return store.entries.some((e) => e.code === code)
}

export function addToWatchlist(
  store: WatchlistStore,
  code: string,
  addedAt: string
): WatchlistStore {
  if (isInWatchlist(store, code)) return store
  return { entries: [...store.entries, { code, addedAt }] }
}

export function removeFromWatchlist(
  store: WatchlistStore,
  code: string
): WatchlistStore {
  return { entries: store.entries.filter((e) => e.code !== code) }
}
