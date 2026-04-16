'use client'
import { useRef } from 'react'
import { strings } from '@/lib/strings/ko'

const KEYS = ['ws:watchlist:anon', 'ws:portfolio:anon', 'ws:journal:anon']

export default function DataExportImport() {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    const dump: Record<string, unknown> = {}
    for (const key of KEYS) {
      const raw = window.localStorage.getItem(key)
      if (raw) dump[key] = JSON.parse(raw)
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `money-screener-data-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!window.confirm(strings.dataIO.importConfirm)) return

    try {
      const text = await file.text()
      const data = JSON.parse(text) as Record<string, unknown>
      let count = 0
      for (const key of KEYS) {
        if (key in data) {
          window.localStorage.setItem(key, JSON.stringify(data[key]))
          count++
        }
      }
      if (count === 0) {
        window.alert(strings.dataIO.importInvalid)
      } else {
        window.alert(strings.dataIO.importSuccess)
        window.location.reload()
      }
    } catch {
      window.alert(strings.dataIO.importInvalid)
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex gap-2 text-sm">
      <button type="button" onClick={handleExport}
        className="px-3 py-1 rounded-full bg-bg-secondary-light dark:bg-bg-secondary-dark">
        {strings.dataIO.exportButton}
      </button>
      <button type="button" onClick={() => inputRef.current?.click()}
        className="px-3 py-1 rounded-full bg-bg-secondary-light dark:bg-bg-secondary-dark">
        {strings.dataIO.importButton}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImport}
      />
    </div>
  )
}
