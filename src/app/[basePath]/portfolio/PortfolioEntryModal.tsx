// PortfolioEntryModal.tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import { strings } from '@/lib/strings/ko'
import type { PortfolioEntry } from '@/lib/storage/portfolio'
import type { StocksJson, StockMeta } from '@/lib/types/indicators'

interface Props {
  stocks: StocksJson | null
  initial?: PortfolioEntry
  onSave: (fields: Omit<PortfolioEntry, 'id'>) => void
  onCancel: () => void
}

export default function PortfolioEntryModal({ stocks, initial, onSave, onCancel }: Props) {
  const [code, setCode] = useState(initial?.code ?? '')
  const [buyPrice, setBuyPrice] = useState<number | ''>(initial?.buyPrice ?? '')
  const [quantity, setQuantity] = useState<number | ''>(initial?.quantity ?? '')
  const [boughtAt, setBoughtAt] = useState(initial?.boughtAt ?? new Date().toISOString().slice(0, 10))
  const [memo, setMemo] = useState(initial?.memo ?? '')
  const [search, setSearch] = useState('')

  const matches = useMemo<StockMeta[]>(() => {
    if (!stocks || !search.trim()) return []
    const q = search.toLowerCase()
    return stocks.stocks.filter((s) =>
      s.name.toLowerCase().includes(q) || s.code.includes(q)
    ).slice(0, 8)
  }, [stocks, search])

  const valid = code.length > 0 && typeof buyPrice === 'number' && buyPrice > 0 && typeof quantity === 'number' && quantity > 0

  function submit() {
    if (!valid) return
    onSave({
      code,
      buyPrice: Number(buyPrice),
      quantity: Number(quantity),
      boughtAt,
      memo: memo.trim() ? memo.trim() : undefined
    })
  }

  // ESC 닫기
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const t = strings.portfolio.modal

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
      <div className="bg-bg-primary-light dark:bg-bg-primary-dark rounded-2xl shadow-soft-md p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">{initial ? t.editTitle : t.addTitle}</h2>

        <label className="block mb-3 text-sm">
          {t.stockLabel}
          {!initial && (
            <input
              type="text"
              placeholder={t.stockPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark"
            />
          )}
          {code && <p className="mt-1 font-bold">{code} {stocks?.stocks.find((s) => s.code === code)?.name ?? ''}</p>}
          {matches.length > 0 && (
            <div className="mt-2 border border-border-light dark:border-border-dark rounded-lg max-h-40 overflow-y-auto">
              {matches.map((m) => (
                <button
                  type="button"
                  key={m.code}
                  onClick={() => { setCode(m.code); setSearch('') }}
                  className="w-full text-left px-3 py-2 hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark"
                >
                  {m.name} ({m.code})
                </button>
              ))}
            </div>
          )}
        </label>

        <label className="block mb-3 text-sm">
          {t.buyPriceLabel}
          <input
            type="number"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark"
          />
        </label>

        <label className="block mb-3 text-sm">
          {t.quantityLabel}
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark"
          />
        </label>

        <label className="block mb-3 text-sm">
          {t.boughtAtLabel}
          <input
            type="date"
            value={boughtAt}
            onChange={(e) => setBoughtAt(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark"
          />
        </label>

        <label className="block mb-3 text-sm">
          {t.memoLabel}
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={2}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark"
          />
        </label>

        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-4">{t.hint}</p>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-full text-sm">
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!valid}
            className="px-4 py-2 rounded-full text-sm bg-accent-light dark:bg-accent-dark text-white disabled:opacity-50"
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  )
}
