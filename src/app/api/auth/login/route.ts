import { NextRequest, NextResponse } from 'next/server'
import { findUserById, getSecretBasePath } from '@/lib/auth/config'
import { verifyPassword } from '@/lib/auth/password'
import { signJWT } from '@/lib/auth/jwt'
import { checkRateLimit } from '@/lib/auth/rateLimit'
import { strings } from '@/lib/strings/ko'

const COOKIE_NAME = 'auth_token'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
           || req.headers.get('x-real-ip')
           || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: strings.auth.rateLimit },
      { status: 429 }
    )
  }

  let body: { id?: string, pw?: string, agree?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: strings.auth.loginFail },
      { status: 400 }
    )
  }

  if (!body.agree) {
    return NextResponse.json(
      { error: strings.auth.agreementRequired },
      { status: 400 }
    )
  }

  if (!body.id || !body.pw) {
    return NextResponse.json(
      { error: strings.auth.loginFail },
      { status: 401 }
    )
  }

  const user = findUserById(body.id)
  if (!user) {
    return NextResponse.json(
      { error: strings.auth.loginFail },
      { status: 401 }
    )
  }

  const ok = await verifyPassword(body.pw, user.hash)
  if (!ok) {
    return NextResponse.json(
      { error: strings.auth.loginFail },
      { status: 401 }
    )
  }

  const token = await signJWT({ uid: user.id })
  const basePath = getSecretBasePath()

  const res = NextResponse.json({
    ok: true,
    redirect: `/${basePath}/screener`
  })

  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/'
  })

  return res
}
