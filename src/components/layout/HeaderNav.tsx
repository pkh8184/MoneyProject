'use client'

import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { strings } from '@/lib/strings/ko'

export default function HeaderNav() {
  const params = useParams()
  const pathname = usePathname()
  const basePath = (params?.basePath as string) || ''
  const isStocks = pathname?.endsWith('/stocks')
  const isScreener = pathname?.endsWith('/screener')

  const baseClass = 'text-sm px-2 py-1 rounded-md hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark'
  const activeClass = 'font-bold text-accent-light dark:text-accent-dark'

  return (
    <nav className="flex items-center gap-1">
      <Link
        href={`/${basePath}/screener`}
        className={`${baseClass} ${isScreener ? activeClass : ''}`}
      >
        {strings.screener.expertTitle}
      </Link>
      <Link
        href={`/${basePath}/stocks`}
        className={`${baseClass} ${isStocks ? activeClass : ''}`}
      >
        {strings.stockList.linkLabel}
      </Link>
    </nav>
  )
}
