'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { strings } from '@/lib/strings/ko'
import Button from '@/components/ui/Button'

export default function SideNav() {
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
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

  function linkClass(active: boolean) {
    return `relative flex items-center gap-3 px-5 py-4 rounded-xl text-base ${
      active
        ? 'bg-bg-secondary-light dark:bg-bg-secondary-dark font-bold text-accent-light dark:text-accent-dark'
        : 'hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark'
    }`
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (data?.redirect) window.location.href = data.redirect
      else window.location.reload()
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="메뉴 열기"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark"
      >
        <span className="text-2xl leading-none">≡</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        >
          <nav
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-0 bottom-0 w-[85%] max-w-xs bg-bg-primary-light dark:bg-bg-primary-dark rounded-r-3xl shadow-soft-md p-5 flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <span className="font-bold text-lg">{strings.app.title}</span>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setOpen(false)}
                className="w-10 h-10 rounded-full inline-flex items-center justify-center text-xl hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark"
              >
                ×
              </button>
            </div>

            <div className="space-y-1 flex-1">
              <Link
                href={`/${basePath}/recommendations`}
                onClick={() => setOpen(false)}
                className={linkClass(!!isActive('/recommendations'))}
              >
                💡 <span>구매 추천 일괄</span>
              </Link>
              <Link
                href={`/${basePath}/beginner`}
                onClick={() => setOpen(false)}
                className={linkClass(!!isActive('/beginner'))}
              >
                🌱 <span>{strings.beginner.linkLabel}</span>
              </Link>
              <Link
                href={`/${basePath}/screener`}
                onClick={() => setOpen(false)}
                className={linkClass(!!isActive('/screener'))}
              >
                📊 <span>전략 검색기</span>
              </Link>
              <Link
                href={`/${basePath}/stocks`}
                onClick={() => setOpen(false)}
                className={linkClass(!!isActive('/stocks'))}
              >
                📋 <span>전체 종목</span>
              </Link>
            </div>

            <div className="pt-4 border-t border-border-light dark:border-border-dark">
              <Button
                variant="ghost"
                size="md"
                className="w-full justify-start"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                🔓 {loggingOut ? strings.common.loading : strings.common.logout}
              </Button>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
