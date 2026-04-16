'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createChart, type IChartApi, ColorType, LineStyle,
  type ISeriesApi, CrosshairMode
} from 'lightweight-charts'
import { useAppStore } from '@/store/useAppStore'
import type { StockIndicators } from '@/lib/types/indicators'
import type { SingleStockOhlcv } from '@/lib/dataLoader'
import { computeMA, computeRSI, computeMACD, computeBB } from '@/lib/chartIndicators'

interface Props {
  stock: StockIndicators
  ohlcvFull?: SingleStockOhlcv | null
}

const KR_UP = '#E53935'
const KR_DOWN = '#3DB351'

// 표시 가능한 오버레이 정의
const OVERLAYS = [
  { key: 'ma5',   label: 'MA5 (5일)',    color: '#FFB300' },
  { key: 'ma20',  label: 'MA20 (20일)',   color: '#0064FF' },
  { key: 'ma60',  label: 'MA60 (60일)',   color: '#E53935' },
  { key: 'ma120', label: 'MA120 (120일)', color: '#9C27B0' },
  { key: 'bb',    label: '볼린저밴드',     color: '#888888' }
] as const

// 하단 패널
const PANELS = [
  { key: 'volume', label: '거래량',  emoji: '📊' },
  { key: 'macd',   label: 'MACD',    emoji: '📉' },
  { key: 'rsi',    label: 'RSI',     emoji: '🎯' }
] as const

const DEFAULT_OVERLAYS = new Set(['ma20', 'bb'])
const DEFAULT_PANELS = new Set(['volume'])

function makeChartTheme(theme: 'light' | 'dark') {
  return {
    bg: theme === 'dark' ? '#141414' : '#FFFFFF',
    text: theme === 'dark' ? '#F5F5F5' : '#111111',
    grid: theme === 'dark' ? '#2a2a2a' : '#EEEEEE',
    border: theme === 'dark' ? '#333333' : '#E4E4E4'
  }
}

function commonChartOptions(theme: ReturnType<typeof makeChartTheme>, height: number) {
  return {
    height,
    layout: {
      background: { type: ColorType.Solid, color: theme.bg },
      textColor: theme.text
    },
    grid: {
      vertLines: { color: theme.grid },
      horzLines: { color: theme.grid }
    },
    rightPriceScale: { borderColor: theme.border },
    timeScale: { borderColor: theme.border, timeVisible: false, secondsVisible: false },
    crosshair: { mode: CrosshairMode.Normal }
  }
}

export default function StockChart({ stock, ohlcvFull }: Props) {
  const mainRef = useRef<HTMLDivElement>(null)
  const volRef = useRef<HTMLDivElement>(null)
  const macdRef = useRef<HTMLDivElement>(null)
  const rsiRef = useRef<HTMLDivElement>(null)

  const theme = useAppStore((s) => s.theme)
  const [visibleOverlays, setVisibleOverlays] = useState<Set<string>>(DEFAULT_OVERLAYS)
  const [visiblePanels, setVisiblePanels] = useState<Set<string>>(DEFAULT_PANELS)

  const toggleOverlay = (key: string) => {
    setVisibleOverlays((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const togglePanel = (key: string) => {
    setVisiblePanels((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const showAll = () => {
    setVisibleOverlays(new Set(OVERLAYS.map((o) => o.key)))
    setVisiblePanels(new Set(PANELS.map((p) => p.key)))
  }
  const showSimple = () => {
    setVisibleOverlays(new Set(DEFAULT_OVERLAYS))
    setVisiblePanels(new Set(DEFAULT_PANELS))
  }

  const dataSource = useMemo(() => {
    if (ohlcvFull && ohlcvFull.dates.length > 0) {
      const closes = ohlcvFull.close
      return {
        dates: ohlcvFull.dates,
        open: ohlcvFull.open,
        high: ohlcvFull.high,
        low: ohlcvFull.low,
        close: ohlcvFull.close,
        volume: ohlcvFull.volume,
        ma5: computeMA(closes, 5),
        ma20: computeMA(closes, 20),
        ma60: computeMA(closes, 60),
        ma120: computeMA(closes, 120),
        rsi14: computeRSI(closes, 14),
        macd_line: computeMACD(closes).line,
        macd_signal: computeMACD(closes).signal,
        macd_hist: computeMACD(closes).hist,
        bb_upper: computeBB(closes, 20, 2).upper,
        bb_lower: computeBB(closes, 20, 2).lower
      }
    }
    return {
      dates: stock.dates,
      open: stock.open ?? stock.close,
      high: stock.high ?? stock.close,
      low: stock.low ?? stock.close,
      close: stock.close,
      volume: stock.volume,
      ma5: stock.ma5,
      ma20: stock.ma20,
      ma60: stock.ma60,
      ma120: stock.ma120,
      rsi14: stock.rsi14,
      macd_line: stock.macd_line,
      macd_signal: stock.macd_signal,
      macd_hist: stock.macd_hist,
      bb_upper: stock.bb_upper,
      bb_lower: stock.bb_lower
    }
  }, [stock, ohlcvFull])

  useEffect(() => {
    if (!mainRef.current) return
    const t = makeChartTheme(theme)
    const charts: IChartApi[] = []
    const containerWidth = mainRef.current.clientWidth
    const src = dataSource

    // ============ MAIN ============
    const mainChart = createChart(mainRef.current, {
      ...commonChartOptions(t, 320),
      width: containerWidth,
      timeScale: { ...commonChartOptions(t, 0).timeScale, timeVisible: false }
    })
    charts.push(mainChart)

    const candle = mainChart.addCandlestickSeries({
      upColor: KR_UP, downColor: KR_DOWN,
      borderUpColor: KR_UP, borderDownColor: KR_DOWN,
      wickUpColor: KR_UP, wickDownColor: KR_DOWN
    })
    candle.setData(
      src.dates.map((d, i) => ({
        time: d,
        open: src.open[i] ?? src.close[i],
        high: src.high[i] ?? src.close[i],
        low: src.low[i] ?? src.close[i],
        close: src.close[i]
      })) as any
    )

    const addLine = (values: (number | null)[], color: string, width = 1, dashed = false) => {
      const series = mainChart.addLineSeries({
        color,
        lineWidth: width as 1,
        lineStyle: dashed ? LineStyle.Dashed : LineStyle.Solid,
        crosshairMarkerVisible: false,
        priceLineVisible: false,
        lastValueVisible: true
      })
      series.setData(
        src.dates
          .map((d, i) => ({ time: d, value: values[i] }))
          .filter((p) => p.value != null) as any
      )
      return series
    }

    if (visibleOverlays.has('ma5')) addLine(src.ma5, '#FFB300', 1)
    if (visibleOverlays.has('ma20')) addLine(src.ma20, '#0064FF', 2)
    if (visibleOverlays.has('ma60')) addLine(src.ma60, '#E53935', 1)
    if (visibleOverlays.has('ma120')) addLine(src.ma120, '#9C27B0', 1)
    if (visibleOverlays.has('bb')) {
      const bbColor = theme === 'dark' ? 'rgba(150,150,200,0.5)' : 'rgba(100,100,150,0.4)'
      addLine(src.bb_upper, bbColor, 1, true)
      addLine(src.bb_lower, bbColor, 1, true)
    }

    // ============ VOLUME ============
    if (visiblePanels.has('volume') && volRef.current) {
      const volChart = createChart(volRef.current, {
        ...commonChartOptions(t, 100),
        width: containerWidth,
        timeScale: { ...commonChartOptions(t, 0).timeScale, timeVisible: false }
      })
      charts.push(volChart)
      const volSeries = volChart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: ''
      }) as ISeriesApi<'Histogram'>
      volSeries.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0 } })
      volSeries.setData(
        src.dates.map((d, i) => ({
          time: d,
          value: src.volume[i],
          color: i === 0 || src.close[i] >= src.close[i - 1] ? KR_UP : KR_DOWN
        })) as any
      )
    }

    // ============ MACD ============
    if (visiblePanels.has('macd') && macdRef.current) {
      const macdChart = createChart(macdRef.current, {
        ...commonChartOptions(t, 100),
        width: containerWidth,
        timeScale: { ...commonChartOptions(t, 0).timeScale, timeVisible: false }
      })
      charts.push(macdChart)
      macdChart.addHistogramSeries({
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 }
      }).setData(
        src.dates.map((d, i) => {
          const v = src.macd_hist[i]
          return v == null ? null : { time: d, value: v, color: v >= 0 ? KR_UP : KR_DOWN }
        }).filter(Boolean) as any
      )
      const ml = macdChart.addLineSeries({ color: '#0064FF', lineWidth: 1, lastValueVisible: true, priceLineVisible: false })
      ml.setData(src.dates.map((d, i) => ({ time: d, value: src.macd_line[i] })).filter((p) => p.value != null) as any)
      const sl = macdChart.addLineSeries({ color: '#E53935', lineWidth: 1, lastValueVisible: true, priceLineVisible: false })
      sl.setData(src.dates.map((d, i) => ({ time: d, value: src.macd_signal[i] })).filter((p) => p.value != null) as any)
    }

    // ============ RSI ============
    if (visiblePanels.has('rsi') && rsiRef.current) {
      const rsiChart = createChart(rsiRef.current, {
        ...commonChartOptions(t, 100),
        width: containerWidth,
        timeScale: { ...commonChartOptions(t, 0).timeScale, timeVisible: true }
      })
      charts.push(rsiChart)
      const rs = rsiChart.addLineSeries({ color: '#9C27B0', lineWidth: 1, lastValueVisible: true, priceLineVisible: false })
      rs.setData(src.dates.map((d, i) => ({ time: d, value: src.rsi14[i] })).filter((p) => p.value != null) as any)
      rs.createPriceLine({ price: 70, color: '#E53935', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '과매수' })
      rs.createPriceLine({ price: 30, color: '#3DB351', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '과매도' })
    }

    // Sync
    if (charts.length > 1) {
      const syncRange = (source: IChartApi) => {
        const range = source.timeScale().getVisibleLogicalRange()
        if (!range) return
        for (const c of charts) { if (c !== source) c.timeScale().setVisibleLogicalRange(range) }
      }
      for (const c of charts) { c.timeScale().subscribeVisibleLogicalRangeChange(() => syncRange(c)) }
    }
    charts[0].timeScale().fitContent()

    const handleResize = () => {
      if (!mainRef.current) return
      const w = mainRef.current.clientWidth
      for (const c of charts) c.applyOptions({ width: w })
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      for (const c of charts) c.remove()
    }
  }, [dataSource, theme, visibleOverlays, visiblePanels])

  const dayCount = dataSource.dates.length

  return (
    <div className="w-full">
      {/* 오버레이 토글 */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark mr-1">차트 위 표시:</span>
        {OVERLAYS.map((o) => {
          const on = visibleOverlays.has(o.key)
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => toggleOverlay(o.key)}
              className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition ${
                on
                  ? 'border-transparent shadow-soft font-medium'
                  : 'border-border-light dark:border-border-dark opacity-50'
              }`}
              style={on ? { backgroundColor: o.color + '18', color: o.color } : {}}
            >
              <span
                className="inline-block w-3 h-0.5 rounded-full"
                style={{ backgroundColor: o.color }}
              />
              {o.label}
            </button>
          )
        })}
      </div>

      {/* 하단 패널 토글 */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark mr-1">하단 패널:</span>
        {PANELS.map((p) => {
          const on = visiblePanels.has(p.key)
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => togglePanel(p.key)}
              className={`text-sm px-3 py-1.5 rounded-full border transition ${
                on
                  ? 'bg-accent-light dark:bg-accent-dark text-white border-transparent'
                  : 'border-border-light dark:border-border-dark opacity-50'
              }`}
            >
              {p.emoji} {p.label}
            </button>
          )
        })}
        <span className="ml-auto flex gap-1">
          <button type="button" onClick={showSimple} className="text-xs text-text-secondary-light dark:text-text-secondary-dark hover:underline">간단히</button>
          <span className="text-text-secondary-light dark:text-text-secondary-dark">·</span>
          <button type="button" onClick={showAll} className="text-xs text-text-secondary-light dark:text-text-secondary-dark hover:underline">모두 보기</button>
        </span>
      </div>

      {/* 차트 영역 */}
      <div ref={mainRef} className="w-full" />
      {visiblePanels.has('volume') && <div ref={volRef} className="w-full mt-1" />}
      {visiblePanels.has('macd') && <div ref={macdRef} className="w-full mt-1" />}
      {visiblePanels.has('rsi') && <div ref={rsiRef} className="w-full mt-1" />}

      {/* 범위 라벨 */}
      <div className="mt-2 text-sm text-text-secondary-light dark:text-text-secondary-dark">
        {dayCount > 800 ? '5년' : dayCount > 400 ? '3년' : dayCount > 150 ? '1년' : `${dayCount}일`} ({dayCount}거래일)
      </div>
    </div>
  )
}
