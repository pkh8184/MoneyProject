import { describe, it, expect } from 'vitest'
import { detectFromIndicators } from '../useMacroAutoDetect'
import type { MacroIndicatorsJson } from '@/lib/types/indicators'

function mk(overrides: Partial<MacroIndicatorsJson> = {}): MacroIndicatorsJson {
  return {
    updated_at: '2026-04-17T18:00:00+09:00',
    forex_usd_krw: null,
    oil_wti: null,
    kospi: null,
    ...overrides
  }
}

function mkInd(v: Partial<{ change_20d_pct: number | null; change_5d_pct: number | null; vs_ma20_pct: number | null }>) {
  return { current: 100, change_20d_pct: null as number | null, change_5d_pct: null as number | null, vs_ma20_pct: null as number | null, ...v }
}

describe('detectFromIndicators', () => {
  it('returns empty when indicators null', () => {
    expect(detectFromIndicators(null)).toEqual([])
  })

  it('detects krw_weak when forex 20d >= +3', () => {
    const ind = mk({ forex_usd_krw: mkInd({ change_20d_pct: 3.5 }) })
    expect(detectFromIndicators(ind)).toContain('krw_weak')
  })

  it('detects krw_strong when forex 20d <= -3', () => {
    const ind = mk({ forex_usd_krw: mkInd({ change_20d_pct: -3.2 }) })
    expect(detectFromIndicators(ind)).toContain('krw_strong')
  })

  it('detects oil_up when oil 20d >= +10', () => {
    const ind = mk({ oil_wti: mkInd({ change_20d_pct: 12.5 }) })
    expect(detectFromIndicators(ind)).toContain('oil_up')
  })

  it('detects oil_down when oil 20d <= -10', () => {
    const ind = mk({ oil_wti: mkInd({ change_20d_pct: -11.2 }) })
    expect(detectFromIndicators(ind)).toContain('oil_down')
  })

  it('detects kospi_crash when 5d <= -3', () => {
    const ind = mk({ kospi: mkInd({ change_5d_pct: -3.5 }) })
    expect(detectFromIndicators(ind)).toContain('kospi_crash')
  })

  it('detects kospi_crash when vs_ma20 <= -5', () => {
    const ind = mk({ kospi: mkInd({ change_5d_pct: -1, vs_ma20_pct: -6 }) })
    expect(detectFromIndicators(ind)).toContain('kospi_crash')
  })

  it('does not detect when within thresholds', () => {
    const ind = mk({
      forex_usd_krw: mkInd({ change_20d_pct: 1.5 }),
      oil_wti: mkInd({ change_20d_pct: 5 }),
      kospi: mkInd({ change_5d_pct: -1, vs_ma20_pct: -2 })
    })
    expect(detectFromIndicators(ind)).toEqual([])
  })

  it('handles null fields gracefully', () => {
    const ind = mk({
      forex_usd_krw: mkInd({ change_20d_pct: null }),
      oil_wti: null
    })
    expect(detectFromIndicators(ind)).toEqual([])
  })
})
