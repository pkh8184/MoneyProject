import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Money Screener',
  description: '',
  robots: { index: false, follow: false, nocache: true }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
