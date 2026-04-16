'use client'
import { useState, useEffect, useCallback } from 'react'

const STORAGE_VERSION = 1

interface StoredEnvelope<T> {
  version: number
  data: T
}

export function useLocalStore<T>(
  key: string,
  initial: T
): [T, (v: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(initial)

  // 마운트 후 localStorage에서 로드 (SSR-safe)
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(key)
      if (!raw) return
      const parsed = JSON.parse(raw) as StoredEnvelope<T>
      if (parsed?.version === STORAGE_VERSION) {
        setState(parsed.data)
      }
    } catch {
      // corrupted data — 초기값 유지
    }
  }, [key])

  // 다른 탭 변경 감지
  useEffect(() => {
    if (typeof window === 'undefined') return
    function onStorage(e: StorageEvent) {
      if (e.key !== key || e.newValue == null) return
      try {
        const parsed = JSON.parse(e.newValue) as StoredEnvelope<T>
        if (parsed?.version === STORAGE_VERSION) {
          setState(parsed.data)
        }
      } catch { /* ignore */ }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key])

  const update = useCallback(
    (v: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v
        try {
          window.localStorage.setItem(
            key,
            JSON.stringify({ version: STORAGE_VERSION, data: next })
          )
        } catch { /* quota exceeded — 무시 */ }
        return next
      })
    },
    [key]
  )

  return [state, update]
}
