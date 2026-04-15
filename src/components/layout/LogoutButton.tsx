'use client'

import { useState } from 'react'
import { strings } from '@/lib/strings/ko'

export default function LogoutButton() {
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (data?.redirect) {
        window.location.href = data.redirect
      } else {
        window.location.reload()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="text-sm px-3 py-1 rounded-md border border-border-light dark:border-border-dark hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark disabled:opacity-50"
    >
      {loading ? strings.common.loading : strings.common.logout}
    </button>
  )
}
