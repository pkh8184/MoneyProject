'use client'

import { useState } from 'react'
import { strings } from '@/lib/strings/ko'

export default function LoginForm() {
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!agree) {
      setError(strings.auth.agreementRequired)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, pw, agree })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || strings.auth.loginFail)
        return
      }
      window.location.href = data.redirect
    } catch {
      setError(strings.common.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="id" className="block text-sm font-medium mb-1">
          {strings.auth.idLabel}
        </label>
        <input
          id="id"
          name="id"
          type="text"
          autoComplete="username"
          required
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-md bg-bg-primary-light dark:bg-bg-secondary-dark"
        />
      </div>

      <div>
        <label htmlFor="pw" className="block text-sm font-medium mb-1">
          {strings.auth.pwLabel}
        </label>
        <input
          id="pw"
          name="pw"
          type="password"
          autoComplete="current-password"
          required
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-md bg-bg-primary-light dark:bg-bg-secondary-dark"
        />
      </div>

      <label className="flex items-start gap-2 text-xs">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-0.5"
        />
        <span>{strings.auth.agreementLabel}</span>
      </label>

      {error && (
        <p role="alert" className="text-sm text-positive-light dark:text-positive-dark">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-accent-light dark:bg-accent-dark text-white rounded-md font-medium disabled:opacity-50"
      >
        {loading ? strings.common.loading : strings.auth.loginButton}
      </button>
    </form>
  )
}
