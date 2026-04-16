// JournalEntryModal.tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import { strings } from '@/lib/strings/ko'
import type { JournalEntry } from '@/lib/storage/journal'
import type { StocksJson, StockMeta } from '@/lib/types/indicators'

interface Props {
  stocks: StocksJson | null
  initial?: JournalEntry
  onSave: (fields: Omit<JournalEntry, 'id'>) => void
  onCancel: () => void
}

export default function JournalEntryModal({ stocks, initial, onSave, onCancel }: Props) {
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10))
  const [code, setCode] = useState(initial?.code ?? '')
  const [type, setType] = useState<'buy' | 'sell'>(initial?.type ?? 'buy')
  const [price, setPrice] = useState<number | ''>(initial?.price ?? '')
  const [quantity, setQuantity] = useState<number | ''>(initial?.quantity ?? '')
  const [profit, setProfit] = useState<number | ''>(initial?.profit ?? '')
  const [reason, setReason] = useState(initial?.reason ?? '')
  const [search, setSearch] = useState('')

  const matches = useMemo<StockMeta[]>(() => {
    if (!stocks || !search.trim()) return []
    const q = search.toLowerCase()
    return stocks.stocks.filter((s) =>
      s.name.toLowerCase().includes(q) || s.code.includes(q)
    ).slice(0, 8)
  }, [stocks, search])

  const valid = code.length > 0 && typeof price === 'number' && price > 0 && typeof quantity === 'number' && quantity > 0

  function submit() {
    if (!valid) return
    onSave({
      date, code, type,
      price: Number(price),
      quantity: Number(quantity),
      profit: type === 'sell' && profit !== '' ? Number(profit) : undefined,
      reason: reason.trim() ? reason.trim() : undefined
    })
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const t = strings.journal.modal

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
      <div className="bg-bg-primary-light dark:bg-bg-primary-dark rounded-2xl shadow-soft-md p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">{initial ? t.editTitle : t.addTitle}</h2>

        <label className="block mb-3 text-sm">
          {t.dateLabel}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark" />
        </label>

        <label className="block mb-3 text-sm">
          {t.stockLabel}
          {!initial && (
            <input type="text" placeholder={t.stockPlaceholder} value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark" />
          )}
          {code && <p className="mt-1 font-bold">{code} {stocks?.stocks.find((s) => s.code === code)?.name ?? ''}</p>}
          {matches.length > 0 && (
            <div className="mt-2 border border-border-light dark:border-border-dark rounded-lg max-h-40 overflow-y-auto">
              {matches.map((m) => (
                <button type="button" key={m.code} onClick={() => { setCode(m.code); setSearch('') }}
                  className="w-full text-left px-3 py-2 hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark">
                  {m.name} ({m.code})
                </button>
              ))}
            </div>
          )}
        </label>

        <fieldset className="mb-3 text-sm">
          <legend>{t.typeLabel}</legend>
          <label className="mr-4">
            <input type="radio" checked={type === 'buy'} onChange={() => setType('buy')} /> {t.typeBuy}
          </label>
          <label>
            <input type="radio" checked={type === 'sell'} onChange={() => setType('sell')} /> {t.typeSell}
          </label>
        </fieldset>

        <label className="block mb-3 text-sm">
          {t.priceLabel}
          <input type="number" value={price}
            onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark" />
        </label>

        <label className="block mb-3 text-sm">
          {t.quantityLabel}
          <input type="number" value={quantity}
            onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark" />
        </label>

        {type === 'sell' && (
          <label className="block mb-3 text-sm">
            {t.profitLabel}
            <input type="number" value={profit}
              onChange={(e) => setProfit(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark" />
            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">{t.profitHint}</p>
          </label>
        )}

        <label className="block mb-4 text-sm">
          {t.reasonLabel}
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark" />
        </label>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-full text-sm">{t.cancel}</button>
          <button type="button" onClick={submit} disabled={!valid}
            className="px-4 py-2 rounded-full text-sm bg-accent-light dark:bg-accent-dark text-white disabled:opacity-50">
            {t.save}
          </button>
        </div>
      </div>
    </div>
  )
}
