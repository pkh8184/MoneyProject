'use client'

import { useEffect, useMemo, useRef } from 'react'
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

  // 데이터 소스: ohlcvFull(3년)이 있으면 그거, 없으면 stock(30일) 폴백
  const dataSource = useMemo(() => {
    if (ohlcvFull && ohlcvFull.dates.length > 0) {
      const closes = ohlcvFull.close
      const ma5 = computeMA(closes, 5)
      const ma20 = computeMA(closes, 20)
      const ma60 = computeMA(closes, 60)
      const ma120 = computeMA(closes, 120)
      const rsi14 = computeRSI(closes, 14)
      const macd = computeMACD(closes)
      const bb = computeBB(closes, 20, 2)
      return {
        dates: ohlcvFull.dates,
        open: ohlcvFull.open,
        high: ohlcvFull.high,
        low: ohlcvFull.low,
        close: ohlcvFull.close,
        volume: ohlcvFull.volume,
        ma5, ma20, ma60, ma120,
        rsi14,
        macd_line: macd.line,
        macd_signal: macd.signal,
        macd_hist: macd.hist,
        bb_upper: bb.upper,
        bb_lower: bb.lower
      }
    }
    // Fallback: 30일 indicators.json
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

    // ============ MAIN: candles + MA + BB ============
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
    const candleData = src.dates.map((d, i) => ({
      time: d,
      open: src.open[i] ?? src.close[i],
      high: src.high[i] ?? src.close[i],
      low: src.low[i] ?? src.close[i],
      close: src.close[i]
    }))
    candle.setData(candleData as any)

    const addLine = (values: (number | null)[], color: string, width = 1) => {
      const series = mainChart.addLineSeries({
        color,
        lineWidth: width as 1,
        lineStyle: LineStyle.Solid,
        crosshairMarkerVisible: false,
        priceLineVisible: false,
        lastValueVisible: false
      })
      series.setData(
        src.dates
          .map((d, i) => ({ time: d, value: values[i] }))
          .filter((p) => p.value != null) as any
      )
      return series
    }

    addLine(src.ma5, '#FFB300', 1)
    addLine(src.ma20, '#0064FF', 1)
    addLine(src.ma60, '#E53935', 1)
    addLine(src.ma120, '#9C27B0', 1)
    const bbColor = theme === 'dark' ? 'rgba(150,150,200,0.6)' : 'rgba(100,100,150,0.6)'
    addLine(src.bb_upper, bbColor, 1)
    addLine(src.bb_lower, bbColor, 1)

    // ============ VOLUME ============
    if (volRef.current) {
      const volChart = createChart(volRef.current, {
        ...commonChartOptions(t, 120),
        width: containerWidth,
        timeScale: { ...commonChartOptions(t, 0).timeScale, timeVisible: false, visible: false }
      })
      charts.push(volChart)

      const volSeries = volChart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: ''
      }) as ISeriesApi<'Histogram'>
      volSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.1, bottom: 0 }
      })
      const volData = src.dates.map((d, i) => {
        const isUp = i === 0 ? true : src.close[i] >= src.close[i - 1]
        return {
          time: d,
          value: src.volume[i],
          color: isUp ? KR_UP : KR_DOWN
        }
      })
      volSeries.setData(volData as any)
    }

    // ============ MACD + RSI ============
    if (macdRef.current && rsiRef.current) {
      const macdChart = createChart(macdRef.current, {
        ...commonChartOptions(t, 120),
        width: containerWidth,
        timeScale: { ...commonChartOptions(t, 0).timeScale, timeVisible: false }
      })
      charts.push(macdChart)

      const histSeries = macdChart.addHistogramSeries({
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 }
      })
      const histData = src.dates.map((d, i) => {
        const v = src.macd_hist[i]
        if (v == null) return null
        return { time: d, value: v, color: v >= 0 ? KR_UP : KR_DOWN }
      }).filter((x) => x != null) as any[]
      histSeries.setData(histData)

      const macdLine = macdChart.addLineSeries({
        color: '#0064FF', lineWidth: 1, lastValueVisible: false, priceLineVisible: false
      })
      macdLine.setData(
        src.dates.map((d, i) => ({ time: d, value: src.macd_line[i] }))
          .filter((p) => p.value != null) as any
      )
      const sigLine = macdChart.addLineSeries({
        color: '#E53935', lineWidth: 1, lastValueVisible: false, priceLineVisible: false
      })
      sigLine.setData(
        src.dates.map((d, i) => ({ time: d, value: src.macd_signal[i] }))
          .filter((p) => p.value != null) as any
      )

      const rsiChart = createChart(rsiRef.current, {
        ...commonChartOptions(t, 120),
        width: containerWidth,
        timeScale: { ...commonChartOptions(t, 0).timeScale, timeVisible: true }
      })
      charts.push(rsiChart)

      const rsiSeries = rsiChart.addLineSeries({
        color: '#9C27B0', lineWidth: 1, lastValueVisible: true, priceLineVisible: false
      })
      rsiSeries.setData(
        src.dates.map((d, i) => ({ time: d, value: src.rsi14[i] }))
          .filter((p) => p.value != null) as any
      )
      rsiSeries.createPriceLine({ price: 70, color: '#E53935', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '70' })
      rsiSeries.createPriceLine({ price: 50, color: '#888', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' })
      rsiSeries.createPriceLine({ price: 30, color: '#3DB351', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '30' })
    }

    // Sync time scales
    if (charts.length > 1) {
      const syncRange = (source: IChartApi) => {
        const range = source.timeScale().getVisibleLogicalRange()
        if (!range) return
        for (const c of charts) {
          if (c !== source) c.timeScale().setVisibleLogicalRange(range)
        }
      }
      for (const c of charts) {
        c.timeScale().subscribeVisibleLogicalRangeChange(() => syncRange(c))
      }
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
  }, [dataSource, theme])

  const dayCount = dataSource.dates.length
  const rangeLabel = dayCount > 400 ? '3년' : dayCount > 150 ? '1년' : `${dayCount}일`

  return (
    <div className="w-full space-y-1">
      <div ref={mainRef} className="w-full" />
      <div ref={volRef} className="w-full" />
      <div ref={macdRef} className="w-full" />
      <div ref={rsiRef} className="w-full" />
      <div className="flex flex-wrap gap-3 text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
        <span>범위: {rangeLabel} ({dayCount}거래일)</span>
        <span>📈 캔들·MA5/20/60/120·BB</span>
        <span>📊 거래량</span>
        <span>📉 MACD</span>
        <span>🎯 RSI</span>
      </div>
    </div>
  )
}
