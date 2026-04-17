'use client'
import { useCallback, useMemo } from 'react'
import { useLocalStore } from '@/lib/storage/useLocalStore'
import { macroFactors } from './factors'
import type { MacroFactor } from './types'

interface StoreV1 {
  activeIds: string[]
}

interface StoreV2 {
  version: 2
  activeIds: string[]
  activatedAt: Record<string, number>
}

type Store = StoreV1 | StoreV2

function isV2(s: Store): s is StoreV2 {
  return (s as StoreV2).version === 2
}

function toV2(s: Store): StoreV2 {
  if (isV2(s)) return s
  return {
    version: 2,
    activeIds: s.activeIds,
    activatedAt: {}
  }
}

function initialStore(): StoreV2 {
  return {
    version: 2,
    activeIds: macroFactors.filter((f) => f.defaultActive).map((f) => f.id),
    activatedAt: {}
  }
}

export function useMacroFactors(userId: string = 'anon', autoDetectedIds: string[] = []): {
  all: MacroFactor[]
  activeIds: string[]
  activeFactors: MacroFactor[]
  activatedAt: Record<string, number>
  autoDetectedIds: string[]
  toggle: (id: string) => void
  clearAll: () => void
  isActive: (id: string) => boolean
  isAutoDetected: (id: string) => boolean
  applyAllAutoDetected: () => void
} {
  const [store, setStore] = useLocalStore<Store>(
    `ws:macroFactors:${userId}`,
    initialStore()
  )

  const v2 = useMemo(() => toV2(store), [store])

  const activeFactors = useMemo(
    () => macroFactors.filter((f) => v2.activeIds.includes(f.id)),
    [v2.activeIds]
  )

  const toggle = useCallback(
    (id: string) => {
      setStore((prev) => {
        const cur = toV2(prev)
        const isActive = cur.activeIds.includes(id)
        if (isActive) {
          // removing: clear activatedAt for this id
          const nextActivatedAt = { ...cur.activatedAt }
          delete nextActivatedAt[id]
          return {
            version: 2,
            activeIds: cur.activeIds.filter((x) => x !== id),
            activatedAt: nextActivatedAt
          }
        }
        // adding via manual toggle: do NOT record activatedAt (manual toggle = no decay)
        return {
          version: 2,
          activeIds: [...cur.activeIds, id],
          activatedAt: cur.activatedAt
        }
      })
    },
    [setStore]
  )

  const clearAll = useCallback(() => {
    setStore({ version: 2, activeIds: [], activatedAt: {} })
  }, [setStore])

  const isActive = useCallback(
    (id: string) => v2.activeIds.includes(id),
    [v2.activeIds]
  )

  const isAutoDetected = useCallback(
    (id: string) => autoDetectedIds.includes(id),
    [autoDetectedIds]
  )

  const applyAllAutoDetected = useCallback(() => {
    setStore((prev) => {
      const cur = toV2(prev)
      const nextIds = [...cur.activeIds]
      const nextActivatedAt = { ...cur.activatedAt }
      const now = Date.now()
      for (const id of autoDetectedIds) {
        if (!nextIds.includes(id)) {
          nextIds.push(id)
          nextActivatedAt[id] = now
        }
      }
      return {
        version: 2,
        activeIds: nextIds,
        activatedAt: nextActivatedAt
      }
    })
  }, [autoDetectedIds, setStore])

  return {
    all: macroFactors,
    activeIds: v2.activeIds,
    activeFactors,
    activatedAt: v2.activatedAt,
    autoDetectedIds,
    toggle,
    clearAll,
    isActive,
    isAutoDetected,
    applyAllAutoDetected
  }
}
