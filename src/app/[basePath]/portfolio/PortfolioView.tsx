'use client'
import { useEffect, useMemo, useState } from 'react'
import { useLocalStore } from '@/lib/storage/useLocalStore'
import { useFirstVisit } from '@/lib/storage/useFirstVisit'
import {
  emptyPortfolio,
  addPortfolioEntry,
  updatePortfolioEntry,
  removePortfolioEntry,
  computeTotals,
  type PortfolioStore,
  type PortfolioEntry
} from '@/lib/storage/portfolio'
import { loadIndicators, loadStocks, loadUpdatedAt } from '@/lib/dataLoader'
import type { IndicatorsJson, StocksJson, StockIndicators } from '@/lib/types/indicators'
import FirstVisitGuide from '@/components/common/FirstVisitGuide'
import PortfolioEntryModal from './PortfolioEntryModal'
import { strings } from '@/lib/strings/ko'

interface Props { basePath: string }

export default function PortfolioView({ basePath: _basePath }: Props) {
  // TODO(phase-13+): 인증 도입 시 userId 기반 키로 변경
  const [store, setStore] = useLocalStore<PortfolioStore>('ws:portfolio:anon', emptyPortfolio())
  const [firstVisit, markVisited] = useFirstVisit('portfolio')
  const [showGuide, setShowGuide] = useState(false)
  const [modal, setModal] = useState<{ open: boolean; editing?: PortfolioEntry }>({ open: false })
  const [indicators, setIndicators] = useState<IndicatorsJson | null>(null)
  const [stocks, setStocks] = useState<StocksJson | null>(null)

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

  const prices: Record<string, number> = useMemo(() => {
    if (!indicators) return {}
    const out: Record<string, number> = {}
    for (const e of store.entries) {
      const s = indicators[e.code] as StockIndicators | undefined
      const last = s?.close?.at(-1)
      if (typeof last === 'number') out[e.code] = last
    }
    return out
  }, [indicators, store.entries])

  const totals = computeTotals(store, prices)

  function summaryText(): string {
    if (Math.abs(totals.totalProfit) < 1) return strings.portfolio.summaryEven
    if (totals.totalProfit > 0) return strings.portfolio.summaryProfit(Math.round(totals.totalProfit))
    return strings.portfolio.summaryLoss(Math.round(totals.totalProfit))
  }

  function handleDelete(e: PortfolioEntry) {
    const name = (indicators?.[e.code] as StockIndicators | undefined)?.name ?? e.code
    if (window.confirm(strings.portfolio.deleteConfirm(name))) {
      setStore(removePortfolioEntry(store, e.id))
    }
  }

  return (
    <>
      <h1 className="text-xl font-bold mb-4">{strings.portfolio.pageTitle}</h1>

      {/* 요약 카드 */}
      {store.entries.length > 0 && (
        <div className="mb-6 p-5 rounded-2xl bg-bg-secondary-light dark:bg-bg-secondary-dark">
          <p className="text-lg font-bold mb-1">{summaryText()}</p>
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
            {strings.portfolio.summarySubtitle(Math.round(totals.totalCost), Math.round(totals.totalValue))}
          </p>
        </div>
      )}

      {/* 추가 버튼 */}
      <button
        type="button"
        onClick={() => setModal({ open: true })}
        className="mb-4 px-4 py-2 rounded-full bg-accent-light dark:bg-accent-dark text-white text-sm"
      >
        {strings.portfolio.addButton}
      </button>

      {store.entries.length === 0 ? (
        <p className="text-text-secondary-light dark:text-text-secondary-dark">
          {strings.portfolio.empty}
        </p>
      ) : (
        <div className="space-y-3">
          {store.entries.map((e) => {
            const s = indicators?.[e.code] as StockIndicators | undefined
            const name = s?.name ?? e.code
            const cur = prices[e.code]
            const cost = e.buyPrice * e.quantity
            const value = (cur ?? e.buyPrice) * e.quantity
            const profit = value - cost
            const pct = cost > 0 ? (profit / cost) * 100 : 0
            return (
              <div key={e.id} className="p-4 rounded-2xl bg-bg-secondary-light dark:bg-bg-secondary-dark">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold">{name}</h3>
                  <div className="flex gap-2 text-sm">
                    <button type="button" onClick={() => setModal({ open: true, editing: e })}>수정</button>
                    <button type="button" onClick={() => handleDelete(e)}>삭제</button>
                  </div>
                </div>
                <p className="text-sm font-mono">{strings.portfolio.cardBuy(e.buyPrice, e.quantity, cost)}</p>
                {cur != null ? (
                  <>
                    <p className="text-sm font-mono">{strings.portfolio.cardNow(cur, e.quantity, value)}</p>
                    <p className={`mt-2 font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {profit >= 0
                        ? strings.portfolio.cardProfit(Math.round(profit), pct)
                        : strings.portfolio.cardLoss(Math.round(profit), pct)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                    {strings.portfolio.cardNoPrice}
                  </p>
                )}
              </div>
            )
          })}
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark text-center pt-2">
            {strings.portfolio.cardFooter}
          </p>
        </div>
      )}

      {modal.open && (
        <PortfolioEntryModal
          stocks={stocks}
          initial={modal.editing}
          onSave={(fields) => {
            if (modal.editing) {
              setStore(updatePortfolioEntry(store, modal.editing.id, fields))
            } else {
              setStore(addPortfolioEntry(store, fields))
            }
            setModal({ open: false })
          }}
          onCancel={() => setModal({ open: false })}
        />
      )}

      {showGuide && (
        <FirstVisitGuide
          steps={[
            { title: '💼 내가 산 주식', body: '내가 가지고 있는 주식으로 지금까지 얼마 벌었는지/잃었는지 한눈에 보여줘요.' },
            { title: '기록하는 방법', body: '＋ 버튼을 눌러 내가 산 주식을 기록하세요 (얼마에 샀는지, 몇 주 샀는지).' },
            { title: '알아두세요', body: '지금 바로의 가격이 아니라 어제 마감 가격 기준이에요.\n수수료·세금은 빠져있어요.' }
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
