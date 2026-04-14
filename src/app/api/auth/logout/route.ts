import { NextResponse } from 'next/server'
import { getSecretBasePath } from '@/lib/auth/config'

export async function POST() {
  const basePath = getSecretBasePath()
  const res = NextResponse.json({ ok: true, redirect: `/${basePath}/login` })
  res.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  })
  return res
}
