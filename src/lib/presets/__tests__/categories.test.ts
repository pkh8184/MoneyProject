import { describe, it, expect } from 'vitest'
import { CATEGORY_META, groupByCategory } from '../categories'
import type { Preset } from '../types'

function mkPreset(id: string, category: any): any {
  return { id, name: id, category, mode: ['expert'], params: [] }
}

describe('CATEGORY_META', () => {
  it('includes all 6 categories with icon and label', () => {
    expect(CATEGORY_META.trend_ma.label).toBe('추세·이동평균')
    expect(CATEGORY_META.trend_ma.icon).toBe('📈')
    expect(CATEGORY_META.combo.order).toBe(6)
  })
})

describe('groupByCategory', () => {
  it('groups presets by category sorted by order', () => {
    const presets = [
      mkPreset('a', 'combo'),
      mkPreset('b', 'trend_ma'),
      mkPreset('c', 'pattern'),
      mkPreset('d', 'trend_ma')
    ]
    const result = groupByCategory(presets as Preset[])
    expect(result.map((g) => g.category)).toEqual(['trend_ma', 'pattern', 'combo'])
    expect(result[0].items.map((p) => p.id)).toEqual(['b', 'd'])
  })

  it('returns empty array for empty input', () => {
    expect(groupByCategory([])).toEqual([])
  })

  it('preserves order within category', () => {
    const presets = [
      mkPreset('x', 'pattern'),
      mkPreset('y', 'pattern'),
      mkPreset('z', 'pattern')
    ]
    const result = groupByCategory(presets as Preset[])
    expect(result[0].items.map((p) => p.id)).toEqual(['x', 'y', 'z'])
  })
})
