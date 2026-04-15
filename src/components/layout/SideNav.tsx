'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { strings } from '@/lib/strings/ko'

export default function SideNav() {
  const [open, setOpen] = useState(false)
  const params = useParams()
  const pathname = usePathname()
  const basePath = (params?.basePath as string) || ''

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('keydown', onKey)
      return () => document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const isActive = (path: string) => pathname?.endsWith(path)
  const linkClass = (active: boolean) =>
    `block px-4 py-3 rounded-md text-sm ${active ? 'font-bold text-accent-light dark:text-accent-dark bg-bg-secondary-light dark:bg-bg-secondary-dark' : 'hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark'}`

  return (
    <>
      <button
        type="button"
        aria-label="메뉴 열기"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark"
      >
        <span className="text-xl leading-none">≡</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        >
          <nav
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-0 bottom-0 w-[80%] max-w-xs bg-bg-primary-light dark:bg-bg-primary-dark shadow-xl p-4 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold">{strings.app.title}</span>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setOpen(false)}
                className="text-xl leading-none"
              >
                ×
              </button>
            </div>
            <Link
              href={`/${basePath}/recommendations`}
              onClick={() => setOpen(false)}
              className={linkClass(isActive('/recommendations'))}
            >
              💡 구매 추천 일괄
            </Link>
            <Link
              href={`/${basePath}/screener`}
              onClick={() => setOpen(false)}
              className={linkClass(isActive('/screener'))}
            >
              📊 전략 검색기
            </Link>
            <Link
              href={`/${basePath}/stocks`}
              onClick={() => setOpen(false)}
              className={linkClass(isActive('/stocks'))}
            >
              📋 전체 종목
            </Link>
          </nav>
        </div>
      )}
    </>
  )
}
