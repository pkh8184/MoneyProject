import { SignJWT, jwtVerify } from 'jose'

const JWT_ALG = 'HS256'
const EXPIRES_SEC = 60 * 60 * 24 * 7

export interface JWTPayload {
  uid: string
  iat?: number
  exp?: number
}

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET
  if (!s || s.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 bytes')
  }
  return new TextEncoder().encode(s)
}

export async function signJWT(payload: Pick<JWTPayload, 'uid'>): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return await new SignJWT({ uid: payload.uid })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt(now)
    .setExpirationTime(now + EXPIRES_SEC)
    .sign(getSecret())
}

export async function verifyJWT(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, getSecret(), {
    algorithms: [JWT_ALG]
  })
  if (typeof payload.uid !== 'string') {
    throw new Error('Invalid JWT payload')
  }
  return payload as JWTPayload
}
