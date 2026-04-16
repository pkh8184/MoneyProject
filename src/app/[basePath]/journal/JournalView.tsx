'use client'
import { useEffect, useMemo, useState } from 'react'
import { useLocalStore } from '@/lib/storage/useLocalStore'
import { useFirstVisit } from '@/lib/storage/useFirstVisit'
import {
  emptyJournal,
  addJournalEntry,
  updateJournalEntry,
  removeJournalEntry,
  computeMonthlySummary,
  type JournalStore,
  type JournalEntry
} from '@/lib/storage/journal'
import { loadIndicators, loadStocks, loadUpdatedAt } from '@/lib/dataLoader'
import type { IndicatorsJson, StocksJson, StockIndicators } from '@/lib/types/indicators'
import FirstVisitGuide from '@/components/common/FirstVisitGuide'
import JournalEntryModal from './JournalEntryModal'
import { strings } from '@/lib/strings/ko'

interface Props { basePath: string }

type Filter = 'all' | 'buy' | 'sell'

export default function JournalView({ basePath: _basePath }: Props) {
  // TODO(phase-13+): 인증 도입 시 userId 기반 키로 변경
  const [store, setStore] = useLocalStore<JournalStore>('ws:journal:anon', emptyJournal())
  const [firstVisit, markVisited] = useFirstVisit('journal')
  const [showGuide, setShowGuide] = useState(false)
  const [modal, setModal] = useState<{ open: boolean; editing?: JournalEntry }>({ open: false })
  const [indicators, setIndicators] = useState<IndicatorsJson | null>(null)
  const [stocks, setStocks] = useState<StocksJson | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => { if (firstVisit) setShowGuide(true) }, [firstVisit])
  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) return
      const [ind, stk] = await Promise.all([
        loadIndicators(u.trade_date),
        loadStocks(u.trade_date)
      ])
      setIndicators(ind)
      setStocks(stk)
    })
  }, [])

  const currentMonth = new Date().toISOString().slice(0, 7) // 'YYYY-MM'
  const summary = computeMonthlySummary(store, currentMonth)

  const filtered = useMemo(() => {
    const list = filter === 'all' ? store.entries : store.entries.filter((e) => e.type === filter)
    return [...list].sort((a, b) => b.date.localeCompare(a.date))
  }, [store.entries, filter])

  function nameOf(code: string): string {
    return (indicators?.[code] as StockIndicators | undefined)?.name ?? code
  }

  function handleDelete(e: JournalEntry) {
    if (window.confirm(strings.journal.deleteConfirm)) {
      setStore(removeJournalEntry(store, e.id))
    }
  }

  return (
    <>
      <h1 className="text-xl font-bold mb-4">{strings.journal.pageTitle}</h1>

      {/* 월별 요약 */}
      <div className="mb-6 p-5 rounded-2xl bg-bg-secondary-light dark:bg-bg-secondary-dark">
        <h2 className="font-bold mb-2">{strings.journal.monthlyTitle(currentMonth)}</h2>
        <p className="text-sm">{strings.journal.monthlyTotal(summary.totalCount)}</p>
        <p className="text-sm">{strings.journal.monthlyBuySell(summary.buyCount, summary.sellCount)}</p>
        <p className="text-sm">{strings.journal.monthlyWinLoss(summary.winCount, summary.lossCount)}</p>
        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-2">{strings.journal.monthlyHint}</p>
      </div>

      <div className="mb-4 flex gap-2 items-center justify-between flex-wrap">
        <div className="flex gap-2 text-sm">
          {(['all', 'buy', 'sell'] as Filter[]).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full ${
                filter === f
                  ? 'bg-accent-light dark:bg-accent-dark text-white'
                  : 'bg-bg-secondary-light dark:bg-bg-secondary-dark'
              }`}>
              {f === 'all' && strings.journal.filterAll}
              {f === 'buy' && strings.journal.filterBuy}
              {f === 'sell' && strings.journal.filterSell}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setModal({ open: true })}
          className="px-4 py-2 rounded-full bg-accent-light dark:bg-accent-dark text-white text-sm">
          {strings.journal.addButton}
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-text-secondary-light dark:text-text-secondary-dark">{strings.journal.empty}</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <div key={e.id} className="p-4 rounded-2xl bg-bg-secondary-light dark:bg-bg-secondary-dark">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{e.date}</p>
                  <h3 className="font-bold">{nameOf(e.code)}</h3>
                </div>
                <div className="flex gap-2 text-sm">
                  <button type="button" onClick={() => setModal({ open: true, editing: e })}>수정</button>
                  <button type="button" onClick={() => handleDelete(e)}>삭제</button>
                </div>
              </div>
              <p className="text-sm font-mono">
                {e.type === 'buy'
                  ? strings.journal.cardBuy(e.price, e.quantity)
                  : strings.journal.cardSell(e.price, e.quantity)}
              </p>
              {e.type === 'sell' && typeof e.profit === 'number' && (
                <p className={`mt-1 font-bold ${e.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {e.profit >= 0
                    ? strings.journal.cardProfit(e.profit)
                    : strings.journal.cardLoss(e.profit)}
                </p>
              )}
              {e.reason && (
                <p className="mt-1 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                  {strings.journal.cardMemo(e.reason)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <JournalEntryModal
          stocks={stocks}
          initial={modal.editing}
          onSave={(fields) => {
            if (modal.editing) {
              setStore(updateJournalEntry(store, modal.editing.id, fields))
            } else {
              setStore(addJournalEntry(store, fields))
            }
            setModal({ open: false })
          }}
          onCancel={() => setModal({ open: false })}
        />
      )}

      {showGuide && (
        <FirstVisitGuide
          steps={[
            { title: '📓 내 거래 일기', body: '주식을 사고 판 기록을 남기는 곳이에요.' },
            { title: '기록 방법', body: '＋ 버튼으로 거래를 기록하세요. 팔 때 "얼마 벌었는지"를 적으면 이번 달 요약에 반영돼요.' },
            { title: '활용 팁', body: '메모에 "왜 샀는지" 적어두면 나중에 돌아볼 때 도움돼요.' }
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
