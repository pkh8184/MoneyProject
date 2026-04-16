'use client'
import { useCallback } from 'react'
import { useLocalStore } from './useLocalStore'

export function useFirstVisit(pageKey: string): [boolean, () => void] {
  const [visited, setVisited] = useLocalStore<boolean>(`ws:visited:${pageKey}`, false)

  const markVisited = useCallback(() => {
    setVisited(true)
  }, [setVisited])

  return [!visited, markVisited]
}
