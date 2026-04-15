'use client'

import { useEffect, useRef } from 'react'
import { createChart, type IChartApi, ColorType, LineStyle } from 'lightweight-charts'
import { useAppStore } from '@/store/useAppStore'
import type { StockIndicators } from '@/lib/types/indicators'

interface Props { stock: StockIndicators }

export default function StockChart({ stock }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const theme = useAppStore((s) => s.theme)
  const mode = useAppStore((s) => s.mode)

  useEffect(() => {
    if (!containerRef.current) return
    const bg = theme === 'dark' ? '#141414' : '#FFFFFF'
    const text = theme === 'dark' ? '#F5F5F5' : '#111111'
    const grid = theme === 'dark' ? '#333333' : '#E4E4E4'

    const chart: IChartApi = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 400,
      layout: { background: { type: ColorType.Solid, color: bg }, textColor: text },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      rightPriceScale: { borderColor: grid },
      timeScale: { borderColor: grid }
    })

    const candle = chart.addCandlestickSeries({
      upColor: '#E53935', downColor: '#3DB351',
      borderUpColor: '#E53935', borderDownColor: '#3DB351',
      wickUpColor: '#E53935', wickDownColor: '#3DB351'
    })
    const candleData = stock.dates.map((d, i) => ({
      time: d,
      open: stock.close[i],
      high: stock.close[i],
      low: stock.close[i],
      close: stock.close[i]
    }))
    candle.setData(candleData as any)

    if (mode === 'expert') {
      const ma20Line = chart.addLineSeries({ color: '#0064FF', lineWidth: 1, lineStyle: LineStyle.Solid })
      ma20Line.setData(
        stock.dates
          .map((d, i) => ({ time: d, value: stock.ma20[i] }))
          .filter((p) => p.value != null) as any
      )
      const ma60Line = chart.addLineSeries({ color: '#E53935', lineWidth: 1 })
      ma60Line.setData(
        stock.dates
          .map((d, i) => ({ time: d, value: stock.ma60[i] }))
          .filter((p) => p.value != null) as any
      )
    } else {
      const ma20Line = chart.addLineSeries({ color: '#0064FF', lineWidth: 1 })
      ma20Line.setData(
        stock.dates
          .map((d, i) => ({ time: d, value: stock.ma20[i] }))
          .filter((p) => p.value != null) as any
      )
    }

    chart.timeScale().fitContent()

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [stock, theme, mode])

  return <div ref={containerRef} className="w-full h-[400px]" />
}
