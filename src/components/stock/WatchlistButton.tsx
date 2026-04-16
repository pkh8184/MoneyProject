'use client'
import { useLocalStore } from '@/lib/storage/useLocalStore'
import {
  emptyWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist,
  type WatchlistStore
} from '@/lib/storage/watchlist'
import { strings } from '@/lib/strings/ko'

interface Props {
  code: string
  userId?: string
}

export default function WatchlistButton({ code, userId = 'anon' }: Props) {
  const [store, setStore] = useLocalStore<WatchlistStore>(
    `ws:watchlist:${userId}`,
    emptyWatchlist()
  )
  const inList = isInWatchlist(store, code)

  function toggle() {
    if (inList) {
      setStore(removeFromWatchlist(store, code))
    } else {
      const today = new Date().toISOString().slice(0, 10)
      setStore(addToWatchlist(store, code, today))
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={inList ? strings.watchlist.removeAria : strings.watchlist.addAria}
      className="text-2xl leading-none w-10 h-10 inline-flex items-center justify-center rounded-full hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark"
    >
      {inList ? '★' : '☆'}
    </button>
  )
}
