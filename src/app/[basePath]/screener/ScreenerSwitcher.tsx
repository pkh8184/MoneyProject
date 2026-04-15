'use client'

import { useAppStore } from '@/store/useAppStore'
import ExpertScreener from './ExpertScreener'
import BeginnerScreener from './BeginnerScreener'

export default function ScreenerSwitcher() {
  const mode = useAppStore((s) => s.mode)
  return mode === 'expert' ? <ExpertScreener /> : <BeginnerScreener />
}
