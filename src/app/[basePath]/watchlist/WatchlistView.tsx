'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocalStore } from '@/lib/storage/useLocalStore'
import { useFirstVisit } from '@/lib/storage/useFirstVisit'
import {
  emptyWatchlist,
  removeFromWatchlist,
  type WatchlistStore
} from '@/lib/storage/watchlist'
import { loadIndicators, loadUpdatedAt } from '@/lib/dataLoader'
import type { IndicatorsJson, StockIndicators } from '@/lib/types/indicators'
import FirstVisitGuide from '@/components/common/FirstVisitGuide'
import { strings } from '@/lib/strings/ko'

type Sort = 'addedDesc' | 'returnDesc' | 'returnAsc' | 'name'

interface Props { basePath: string }

interface Row {
  code: string
  name: string
  addedAt: string
  price: number | null
  changePct: number | null
}

function computeChange(s: StockIndicators): { price: number | null; pct: number | null } {
  const closes = s.close
  if (!closes || closes.length < 2) return { price: closes?.at(-1) ?? null, pct: null }
  const today = closes.at(-1)!
  const prev = closes.at(-2)!
  if (!prev) return { price: today, pct: null }
  return { price: today, pct: ((today - prev) / prev) * 100 }
}

export default function WatchlistView({ basePath }: Props) {
  // TODO(phase-13+): 인증 도입 시 userId를 prop 또는 컨텍스트로 받아 WatchlistButton과 키 정합성 유지
  const [store, setStore] = useLocalStore<WatchlistStore>(
    'ws:watchlist:anon',
    emptyWatchlist()
  )
  const [firstVisit, markVisited] = useFirstVisit('watchlist')
  const [showGuide, setShowGuide] = useState(false)
  const [sort, setSort] = useState<Sort>('addedDesc')
  const [indicators, setIndicators] = useState<IndicatorsJson | null>(null)

  // 첫 방문 가이드 표시
  useEffect(() => {
    if (firstVisit) setShowGuide(true)
  }, [firstVisit])

  // indicators 로드
  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) return
      const ind = await loadIndicators(u.trade_date)
      setIndicators(ind)
    })
  }, [])

  const rows: Row[] = useMemo(() => {
    if (!indicators) return store.entries.map((e) => ({
      code: e.code, name: e.code, addedAt: e.addedAt, price: null, changePct: null
    }))
    return store.entries.map((e) => {
      const s = indicators[e.code] as StockIndicators | undefined
      const { price, pct } = s ? computeChange(s) : { price: null, pct: null }
      return {
        code: e.code,
        name: s?.name ?? e.code,
        addedAt: e.addedAt,
        price,
        changePct: pct
      }
    })
  }, [store.entries, indicators])

  const sorted = useMemo(() => {
    const arr = [...rows]
    switch (sort) {
      case 'addedDesc': return arr.sort((a, b) => b.addedAt.localeCompare(a.addedAt))
      case 'returnDesc': return arr.sort((a, b) => (b.changePct ?? -Infinity) - (a.changePct ?? -Infinity))
      case 'returnAsc': return arr.sort((a, b) => (a.changePct ?? Infinity) - (b.changePct ?? Infinity))
      case 'name': return arr.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    }
  }, [rows, sort])

  function handleDelete(row: Row) {
    if (window.confirm(strings.watchlist.deleteConfirm(row.name))) {
      setStore(removeFromWatchlist(store, row.code))
    }
  }

  return (
    <>
      <h1 className="text-xl font-bold mb-4">{strings.watchlist.pageTitle}</h1>

      {store.entries.length === 0 ? (
        <p className="text-text-secondary-light dark:text-text-secondary-dark">
          {strings.watchlist.empty}
        </p>
      ) : (
        <>
          <div className="mb-3 flex gap-2 flex-wrap text-sm">
            {(['addedDesc', 'returnDesc', 'returnAsc', 'name'] as Sort[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                className={`px-3 py-1 rounded-full ${
                  sort === s
                    ? 'bg-accent-light dark:bg-accent-dark text-white'
                    : 'bg-bg-secondary-light dark:bg-bg-secondary-dark'
                }`}
              >
                {s === 'addedDesc' && strings.watchlist.sortAddedDesc}
                {s === 'returnDesc' && strings.watchlist.sortReturnDesc}
                {s === 'returnAsc' && strings.watchlist.sortReturnAsc}
                {s === 'name' && strings.watchlist.sortName}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {sorted.map((r) => {
              const positive = (r.changePct ?? 0) >= 0
              return (
                <div
                  key={r.code}
                  className="flex items-center justify-between p-3 rounded-xl bg-bg-secondary-light dark:bg-bg-secondary-dark"
                >
                  <Link
                    href={`/${basePath}/stock/${r.code}`}
                    className="font-bold hover:underline"
                  >
                    {r.name}
                  </Link>
                  <div className="flex items-center gap-4 text-sm">
                    <span>{r.price != null ? r.price.toLocaleString() + '원' : '-'}</span>
                    <span className={positive ? 'text-emerald-600' : 'text-red-600'}>
                      {r.changePct != null
                        ? `${positive ? '🟢' : '🔴'} ${positive ? '+' : ''}${r.changePct.toFixed(2)}%`
                        : '-'}
                    </span>
                    <span className="text-text-secondary-light dark:text-text-secondary-dark">
                      {r.addedAt}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(r)}
                      className="text-lg"
                      aria-label={`${r.name} 삭제`}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {showGuide && (
        <FirstVisitGuide
          steps={[
            { title: '⭐ 즐겨찾기란?', body: '관심있는 종목을 모아두는 곳이에요.' },
            { title: '추가하는 방법', body: '종목 페이지에서 ☆를 누르면 여기에 추가돼요.' },
            { title: '활용 팁', body: '매일 들어와서 종목들이 어떻게 움직이는지 확인해 보세요. 더 이상 관심 없으면 🗑를 눌러 빼면 돼요.' }
          ]}
          onDismiss={(persist) => {
            setShowGuide(false)
            if (persist) markVisited()
          }}
        />
      )}
    </>
  )
}
