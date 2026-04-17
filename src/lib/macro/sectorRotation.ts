import type { SectorRotationJson } from '@/lib/types/indicators'

export interface SectorRotationBonus {
  sectorRotationDelta: number
  activeSector: string | null
  rank: 'strong' | 'weak' | 'neutral' | null
}

export function computeSectorRotationBonus(
  themes: string[] | undefined,
  rotation: SectorRotationJson | null
): SectorRotationBonus {
  if (!themes || !rotation) return { sectorRotationDelta: 0, activeSector: null, rank: null }
  for (const t of themes) {
    const match = rotation.sectors.find((s) => s.theme === t)
    if (match) {
      if (match.rank === 'strong') return { sectorRotationDelta: 3, activeSector: t, rank: 'strong' }
      if (match.rank === 'weak') return { sectorRotationDelta: -3, activeSector: t, rank: 'weak' }
      return { sectorRotationDelta: 0, activeSector: t, rank: 'neutral' }
    }
  }
  return { sectorRotationDelta: 0, activeSector: null, rank: null }
}
