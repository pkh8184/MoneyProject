'use client'

import { useState } from 'react'
import { strings } from '@/lib/strings/ko'
import Button from '@/components/ui/Button'

export default function LoginForm() {
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!agree) { setError(strings.auth.agreementRequired); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, pw, agree })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || strings.auth.loginFail); return }
      window.location.href = data.redirect
    } catch {
      setError(strings.common.error)
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full h-14 px-5 rounded-2xl bg-bg-secondary-light dark:bg-bg-secondary-dark text-base placeholder-text-secondary-light dark:placeholder-text-secondary-dark focus:outline-none focus:ring-2 focus:ring-accent-light dark:focus:ring-accent-dark'

  return (
    <form onSubmit={submit} className="space-y-4">
      <input
        name="id"
        type="text"
        autoComplete="username"
        required
        value={id}
        onChange={(e) => setId(e.target.value)}
        placeholder={strings.auth.idLabel}
        className={inputClass}
      />
      <input
        name="pw"
        type="password"
        autoComplete="current-password"
        required
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder={strings.auth.pwLabel}
        className={inputClass}
      />

      <label className="flex items-start gap-3 py-3 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-1 w-5 h-5 rounded"
        />
        <span className="leading-relaxed">{strings.auth.agreementLabel}</span>
      </label>

      {error && (
        <p role="alert" className="text-sm text-positive-light dark:text-positive-dark">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full">
        {loading ? strings.common.loading : strings.auth.loginButton}
      </Button>
    </form>
  )
}
