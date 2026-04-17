import { describe, it, expect } from 'vitest'
import { computeSectorRotationBonus } from '../sectorRotation'
import type { SectorRotationJson } from '@/lib/types/indicators'

function mkRotation(sectors: { theme: string; rank: 'strong' | 'weak' | 'neutral' }[]): SectorRotationJson {
  return {
    updated_at: '2026-04-17T18:00:00+09:00',
    period_days: 30,
    sectors: sectors.map((s) => ({ ...s, avg_return_pct: 0, sample_stocks: 10 }))
  }
}

describe('computeSectorRotationBonus', () => {
  it('returns 0 when no themes', () => {
    const r = computeSectorRotationBonus(undefined, mkRotation([]))
    expect(r.sectorRotationDelta).toBe(0)
  })

  it('returns 0 when no rotation data', () => {
    const r = computeSectorRotationBonus(['반도체'], null)
    expect(r.sectorRotationDelta).toBe(0)
  })

  it('returns +3 for strong sector match', () => {
    const rot = mkRotation([{ theme: '반도체', rank: 'strong' }])
    const r = computeSectorRotationBonus(['반도체'], rot)
    expect(r.sectorRotationDelta).toBe(3)
    expect(r.rank).toBe('strong')
    expect(r.activeSector).toBe('반도체')
  })

  it('returns -3 for weak sector match', () => {
    const rot = mkRotation([{ theme: '바이오', rank: 'weak' }])
    const r = computeSectorRotationBonus(['바이오'], rot)
    expect(r.sectorRotationDelta).toBe(-3)
    expect(r.rank).toBe('weak')
  })

  it('returns 0 for neutral', () => {
    const rot = mkRotation([{ theme: '금융', rank: 'neutral' }])
    const r = computeSectorRotationBonus(['금융'], rot)
    expect(r.sectorRotationDelta).toBe(0)
    expect(r.rank).toBe('neutral')
  })

  it('picks first matching theme', () => {
    const rot = mkRotation([
      { theme: 'AI', rank: 'strong' },
      { theme: '방산', rank: 'weak' }
    ])
    const r = computeSectorRotationBonus(['AI', '방산'], rot)
    expect(r.sectorRotationDelta).toBe(3)
    expect(r.activeSector).toBe('AI')
  })
})
