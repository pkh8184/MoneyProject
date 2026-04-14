import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = ['/robots.txt', '/favicon.ico']

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET required')
  return new TextEncoder().encode(s)
}

function maintenanceResponse(): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8">
<title>Service Unavailable</title>
<meta name="robots" content="noindex, nofollow">
<style>
body { font-family: system-ui, -apple-system, sans-serif; background:#141414; color:#f5f5f5;
  display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
.box { text-align:center; max-width:500px; padding:40px; }
h1 { font-size:24px; margin-bottom:16px; }
p  { color:#aaa; line-height:1.6; }
</style></head><body>
<div class="box">
<h1>🛠️ 서비스 일시 중단 중입니다</h1>
<p>이번 달 무료 사용 한도에 근접하여 서비스가 일시 중단되었습니다.</p>
<p>곧 재개 예정입니다.</p>
</div></body></html>`
  return new NextResponse(html, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Retry-After': '86400'
    }
  })
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const basePath = process.env.SECRET_BASE_PATH || ''

  if (process.env.SITE_ENABLED === 'false') {
    return maintenanceResponse()
  }

  if (PUBLIC_PATHS.some((p) => pathname === p)) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/data/')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  if (!basePath || !pathname.startsWith(`/${basePath}`)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  if (pathname === `/${basePath}/login`) {
    return NextResponse.next()
  }

  const token = req.cookies.get('auth_token')?.value
  if (!token) {
    return NextResponse.redirect(new URL(`/${basePath}/login`, req.url))
  }

  try {
    await jwtVerify(token, getSecret(), { algorithms: ['HS256'] })
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL(`/${basePath}/login`, req.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)']
}
