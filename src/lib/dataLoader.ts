import { get, set } from 'idb-keyval'
import type {
  UpdatedAtJson, IndicatorsJson, FundamentalsJson,
  SectorsJson, PatternStatsJson, StocksJson, MacroIndicatorsJson,
  FactorBacktestJson, StockMacroResponseJson, SectorRotationJson,
  NewsSignalsJson
} from '@/lib/types/indicators'

export type FreshnessLevel = 'fresh' | 'stale24h' | 'stale48h'

const H24_MS = 24 * 60 * 60 * 1000
const H48_MS = 48 * 60 * 60 * 1000

export function getFreshnessLevel(updatedAtMs: number, nowMs: number): FreshnessLevel {
  const diff = nowMs - updatedAtMs
  if (diff > H48_MS) return 'stale48h'
  if (diff > H24_MS) return 'stale24h'
  return 'fresh'
}

export function formatRelative(updatedAtMs: number, nowMs: number): string {
  const diffSec = Math.floor((nowMs - updatedAtMs) / 1000)
  if (diffSec < 60) return '방금 전'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}분 전`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}시간 전`
  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay}일 전`
}

export async function loadUpdatedAt(): Promise<UpdatedAtJson | null> {
  try {
    const res = await fetch('/data/updated_at.json', { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as UpdatedAtJson
  } catch {
    return null
  }
}

const IDB_INDICATORS_KEY = 'indicators-cache-v1'
const IDB_FUNDAMENTALS_KEY = 'fundamentals-cache-v1'

interface CachedData<T> {
  trade_date: string
  data: T
}

async function getCached<T>(key: string, tradeDate: string): Promise<T | null> {
  try {
    const cached = await get<CachedData<T>>(key)
    if (cached && cached.trade_date === tradeDate) return cached.data
  } catch { /* IndexedDB unavailable */ }
  return null
}

async function setCached<T>(key: string, tradeDate: string, data: T): Promise<void> {
  try {
    await set(key, { trade_date: tradeDate, data })
  } catch { /* ignore */ }
}

export async function loadIndicators(tradeDate: string): Promise<IndicatorsJson | null> {
  const cached = await getCached<IndicatorsJson>(IDB_INDICATORS_KEY, tradeDate)
  if (cached) return cached

  try {
    const res = await fetch('/data/indicators.json', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as IndicatorsJson
    await setCached(IDB_INDICATORS_KEY, tradeDate, data)
    return data
  } catch {
    return null
  }
}

export async function loadFundamentals(tradeDate: string): Promise<FundamentalsJson | null> {
  const cached = await getCached<FundamentalsJson>(IDB_FUNDAMENTALS_KEY, tradeDate)
  if (cached) return cached

  try {
    const res = await fetch('/data/fundamentals.json', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as FundamentalsJson
    await setCached(IDB_FUNDAMENTALS_KEY, tradeDate, data)
    return data
  } catch {
    return null
  }
}

const IDB_STOCKS_KEY = 'stocks-cache-v1'

export async function loadStocks(tradeDate: string): Promise<StocksJson | null> {
  const cached = await getCached<StocksJson>(IDB_STOCKS_KEY, tradeDate)
  if (cached) return cached
  try {
    const res = await fetch('/data/stocks.json', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as StocksJson
    await setCached(IDB_STOCKS_KEY, tradeDate, data)
    return data
  } catch {
    return null
  }
}

const IDB_SECTORS_KEY = 'sectors-cache-v1'
const IDB_PATTERN_STATS_KEY = 'pattern-stats-cache-v1'

export async function loadSectors(tradeDate: string): Promise<SectorsJson | null> {
  const cached = await getCached<SectorsJson>(IDB_SECTORS_KEY, tradeDate)
  if (cached) return cached
  try {
    const res = await fetch('/data/sectors.json', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as SectorsJson
    await setCached(IDB_SECTORS_KEY, tradeDate, data)
    return data
  } catch {
    return null
  }
}

const IDB_MACRO_KEY = 'macro-indicators-cache-v1'

export async function loadMacroIndicators(tradeDate: string): Promise<MacroIndicatorsJson | null> {
  const cached = await getCached<MacroIndicatorsJson>(IDB_MACRO_KEY, tradeDate)
  if (cached) return cached
  try {
    const res = await fetch('/data/macro_indicators.json', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as MacroIndicatorsJson
    await setCached(IDB_MACRO_KEY, tradeDate, data)
    return data
  } catch {
    return null
  }
}

const IDB_FACTOR_BT_KEY = 'factor-backtest-cache-v1'
const IDB_STOCK_RESP_KEY = 'stock-macro-response-cache-v1'

export async function loadFactorBacktest(tradeDate: string): Promise<FactorBacktestJson | null> {
  const cached = await getCached<FactorBacktestJson>(IDB_FACTOR_BT_KEY, tradeDate)
  if (cached) return cached
  try {
    const res = await fetch('/data/factor_backtest_results.json', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as FactorBacktestJson
    await setCached(IDB_FACTOR_BT_KEY, tradeDate, data)
    return data
  } catch {
    return null
  }
}

export async function loadStockMacroResponse(tradeDate: string): Promise<StockMacroResponseJson | null> {
  const cached = await getCached<StockMacroResponseJson>(IDB_STOCK_RESP_KEY, tradeDate)
  if (cached) return cached
  try {
    const res = await fetch('/data/stock_macro_response.json', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as StockMacroResponseJson
    await setCached(IDB_STOCK_RESP_KEY, tradeDate, data)
    return data
  } catch {
    return null
  }
}

const IDB_SECTOR_ROT_KEY = 'sector-rotation-cache-v1'

export async function loadSectorRotation(tradeDate: string): Promise<SectorRotationJson | null> {
  const cached = await getCached<SectorRotationJson>(IDB_SECTOR_ROT_KEY, tradeDate)
  if (cached) return cached
  try {
    const res = await fetch('/data/sector_rotation.json', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as SectorRotationJson
    await setCached(IDB_SECTOR_ROT_KEY, tradeDate, data)
    return data
  } catch {
    return null
  }
}

const IDB_NEWS_KEY = 'news-signals-cache-v1'

export async function loadNewsSignals(tradeDate: string): Promise<NewsSignalsJson | null> {
  const cached = await getCached<NewsSignalsJson>(IDB_NEWS_KEY, tradeDate)
  if (cached) return cached
  try {
    const res = await fetch('/data/news_signals.json', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as NewsSignalsJson
    await setCached(IDB_NEWS_KEY, tradeDate, data)
    return data
  } catch {
    return null
  }
}

/** 단일 종목의 3년치 OHLCV. ohlcv.json 전체를 한번 fetch 후 code로 추출. */
export interface SingleStockOhlcv {
  dates: string[]
  open: number[]
  high: number[]
  low: number[]
  close: number[]
  volume: number[]
}

const IDB_OHLCV_PREFIX = 'ohlcv-stock-v1-'
const LEGACY_OHLCV_KEY = 'ohlcv-full-cache-v1'

// 최초 호출 시 1회 옛 캐시(48MB 전체) 정리
let legacyCleanupDone = false
async function cleanupLegacyCache() {
  if (legacyCleanupDone) return
  legacyCleanupDone = true
  try {
    const { del } = await import('idb-keyval')
    await del(LEGACY_OHLCV_KEY)
  } catch { /* ignore */ }
}

export async function loadOhlcvForCode(tradeDate: string, code: string): Promise<SingleStockOhlcv | null> {
  cleanupLegacyCache()
  const idbKey = `${IDB_OHLCV_PREFIX}${code}`

  // 종목별 캐시
  const cached = await getCached<SingleStockOhlcv>(idbKey, tradeDate)
  if (cached) return cached

  // per-stock 파일 로드 (~50KB)
  try {
    const res = await fetch(`/data/ohlcv/${code}.json`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as SingleStockOhlcv
    await setCached(idbKey, tradeDate, data)
    return data
  } catch {
    return null
  }
}

export async function loadPatternStats(tradeDate: string): Promise<PatternStatsJson | null> {
  const cached = await getCached<PatternStatsJson>(IDB_PATTERN_STATS_KEY, tradeDate)
  if (cached) return cached
  try {
    const res = await fetch('/data/pattern_stats.json', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as PatternStatsJson
    await setCached(IDB_PATTERN_STATS_KEY, tradeDate, data)
    return data
  } catch {
    return null
  }
}
