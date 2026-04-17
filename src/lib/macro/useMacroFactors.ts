'use client'
import { useCallback, useMemo } from 'react'
import { useLocalStore } from '@/lib/storage/useLocalStore'
import { macroFactors } from './factors'
import type { MacroFactor } from './types'

interface Store {
  activeIds: string[]
}

function initialStore(): Store {
  return {
    activeIds: macroFactors.filter((f) => f.defaultActive).map((f) => f.id)
  }
}

export function useMacroFactors(userId: string = 'anon', autoDetectedIds: string[] = []): {
  all: MacroFactor[]
  activeIds: string[]
  activeFactors: MacroFactor[]
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

  const activeFactors = useMemo(
    () => macroFactors.filter((f) => store.activeIds.includes(f.id)),
    [store.activeIds]
  )

  const toggle = useCallback(
    (id: string) => {
      setStore((prev) => {
        const isActive = prev.activeIds.includes(id)
        return {
          activeIds: isActive
            ? prev.activeIds.filter((x) => x !== id)
            : [...prev.activeIds, id]
        }
      })
    },
    [setStore]
  )

  const clearAll = useCallback(() => {
    setStore({ activeIds: [] })
  }, [setStore])

  const isActive = useCallback(
    (id: string) => store.activeIds.includes(id),
    [store.activeIds]
  )

  const isAutoDetected = useCallback(
    (id: string) => autoDetectedIds.includes(id),
    [autoDetectedIds]
  )

  const applyAllAutoDetected = useCallback(() => {
    setStore((prev) => {
      const next = [...prev.activeIds]
      for (const id of autoDetectedIds) {
        if (!next.includes(id)) next.push(id)
      }
      return { activeIds: next }
    })
  }, [autoDetectedIds, setStore])

  return {
    all: macroFactors,
    activeIds: store.activeIds,
    activeFactors,
    autoDetectedIds,
    toggle,
    clearAll,
    isActive,
    isAutoDetected,
    applyAllAutoDetected
  }
}
