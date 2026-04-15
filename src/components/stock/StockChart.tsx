'use client'

import { useEffect, useRef } from 'react'
import {
  createChart, type IChartApi, ColorType, LineStyle,
  type ISeriesApi, CrosshairMode
} from 'lightweight-charts'
import { useAppStore } from '@/store/useAppStore'
import type { StockIndicators } from '@/lib/types/indicators'

interface Props { stock: StockIndicators }

const KR_UP = '#E53935'      // 한국식 양봉 = 빨강
const KR_DOWN = '#3DB351'    // 한국식 음봉 = 녹색

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

export default function StockChart({ stock }: Props) {
  const mainRef = useRef<HTMLDivElement>(null)
  const volRef = useRef<HTMLDivElement>(null)
  const macdRef = useRef<HTMLDivElement>(null)
  const rsiRef = useRef<HTMLDivElement>(null)

  const theme = useAppStore((s) => s.theme)
  const mode = useAppStore((s) => s.mode)
  const showAllPanes = mode === 'expert'

  useEffect(() => {
    if (!mainRef.current) return
    const t = makeChartTheme(theme)
    const charts: IChartApi[] = []

    const containerWidth = mainRef.current.clientWidth

    // ============ MAIN PANE: candles + MA + (BB if expert) ============
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
    const candleData = stock.dates.map((d, i) => ({
      time: d,
      open: stock.close[i],
      high: stock.close[i],
      low: stock.close[i],
      close: stock.close[i]
    }))
    candle.setData(candleData as any)

    // MA lines (always show MA20; expert adds 5/60/120)
    const addMA = (values: (number | null)[], color: string, width = 1) => {
      const series = mainChart.addLineSeries({
        color,
        lineWidth: width as 1,
        lineStyle: LineStyle.Solid,
        crosshairMarkerVisible: false,
        priceLineVisible: false,
        lastValueVisible: false
      })
      series.setData(
        stock.dates
          .map((d, i) => ({ time: d, value: values[i] }))
          .filter((p) => p.value != null) as any
      )
      return series
    }

    if (showAllPanes) {
      addMA(stock.ma5, '#FFB300', 1)    // 노랑
      addMA(stock.ma20, '#0064FF', 1)   // 파랑
      addMA(stock.ma60, '#E53935', 1)   // 빨강
      addMA(stock.ma120, '#9C27B0', 1)  // 보라

      // Bollinger Bands (expert only)
      const bbColor = theme === 'dark' ? 'rgba(150,150,200,0.6)' : 'rgba(100,100,150,0.6)'
      addMA(stock.bb_upper, bbColor, 1)
      addMA(stock.bb_lower, bbColor, 1)
    } else {
      addMA(stock.ma20, '#0064FF', 2)   // 초보: MA20만
    }

    // ============ VOLUME PANE ============
    if (volRef.current) {
      const volChart = createChart(volRef.current, {
        ...commonChartOptions(t, 120),
        width: containerWidth,
        timeScale: { ...commonChartOptions(t, 0).timeScale, timeVisible: false, visible: !showAllPanes }
      })
      charts.push(volChart)

      const volSeries = volChart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: ''
      }) as ISeriesApi<'Histogram'>
      volSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.1, bottom: 0 }
      })
      const volData = stock.dates.map((d, i) => {
        const isUp = i === 0 ? true : stock.close[i] >= stock.close[i - 1]
        return {
          time: d,
          value: stock.volume[i],
          color: isUp ? KR_UP : KR_DOWN
        }
      })
      volSeries.setData(volData as any)
    }

    // ============ MACD + RSI panes (expert only) ============
    if (showAllPanes && macdRef.current && rsiRef.current) {
      // MACD
      const macdChart = createChart(macdRef.current, {
        ...commonChartOptions(t, 120),
        width: containerWidth,
        timeScale: { ...commonChartOptions(t, 0).timeScale, timeVisible: false }
      })
      charts.push(macdChart)

      const histSeries = macdChart.addHistogramSeries({
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 }
      })
      const histData = stock.dates.map((d, i) => {
        const v = stock.macd_hist[i]
        if (v == null) return null
        return {
          time: d,
          value: v,
          color: v >= 0 ? KR_UP : KR_DOWN
        }
      }).filter((x) => x != null) as any[]
      histSeries.setData(histData)

      const macdLine = macdChart.addLineSeries({
        color: '#0064FF', lineWidth: 1, lastValueVisible: false, priceLineVisible: false
      })
      macdLine.setData(
        stock.dates
          .map((d, i) => ({ time: d, value: stock.macd_line[i] }))
          .filter((p) => p.value != null) as any
      )

      const sigLine = macdChart.addLineSeries({
        color: '#E53935', lineWidth: 1, lastValueVisible: false, priceLineVisible: false
      })
      sigLine.setData(
        stock.dates
          .map((d, i) => ({ time: d, value: stock.macd_signal[i] }))
          .filter((p) => p.value != null) as any
      )

      // RSI
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
        stock.dates
          .map((d, i) => ({ time: d, value: stock.rsi14[i] }))
          .filter((p) => p.value != null) as any
      )
      // Reference lines at 30, 50, 70
      rsiSeries.createPriceLine({ price: 70, color: '#E53935', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '70' })
      rsiSeries.createPriceLine({ price: 50, color: '#888', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' })
      rsiSeries.createPriceLine({ price: 30, color: '#3DB351', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '30' })
    }

    // ============ SYNC TIME SCALES ============
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

    // Fit content
    charts[0].timeScale().fitContent()

    // Resize handler
    const handleResize = () => {
      if (!mainRef.current) return
      const w = mainRef.current.clientWidth
      for (const c of charts) {
        c.applyOptions({ width: w })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      for (const c of charts) c.remove()
    }
  }, [stock, theme, mode, showAllPanes])

  return (
    <div className="w-full space-y-1">
      <div ref={mainRef} className="w-full" />
      <div ref={volRef} className="w-full" />
      {showAllPanes && (
        <>
          <div ref={macdRef} className="w-full" />
          <div ref={rsiRef} className="w-full" />
        </>
      )}
      <div className="flex flex-wrap gap-3 text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
        {showAllPanes ? (
          <>
            <span>📈 캔들·MA5/20/60/120·BB</span>
            <span>📊 거래량</span>
            <span>📉 MACD</span>
            <span>🎯 RSI</span>
          </>
        ) : (
          <>
            <span>📈 캔들·MA20</span>
            <span>📊 거래량</span>
          </>
        )}
      </div>
    </div>
  )
}
