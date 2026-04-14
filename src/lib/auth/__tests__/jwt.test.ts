import { describe, it, expect, beforeAll } from 'vitest'
import { signJWT, verifyJWT } from '../jwt'

const SECRET = 'test-secret-at-least-32-bytes-long-for-HS256-ok'

beforeAll(() => {
  process.env.JWT_SECRET = SECRET
})

describe('signJWT / verifyJWT', () => {
  it('sign and verify returns the same payload uid', async () => {
    const token = await signJWT({ uid: 'kyungwon' })
    const payload = await verifyJWT(token)
    expect(payload.uid).toBe('kyungwon')
  })

  it('rejects tampered token', async () => {
    const token = await signJWT({ uid: 'kyungwon' })
    const tampered = token.slice(0, -5) + 'aaaaa'
    await expect(verifyJWT(tampered)).rejects.toThrow()
  })

  it('rejects token signed with different secret', async () => {
    const token = await signJWT({ uid: 'kyungwon' })
    process.env.JWT_SECRET = 'different-secret-at-least-32-bytes-long-ok'
    await expect(verifyJWT(token)).rejects.toThrow()
    process.env.JWT_SECRET = SECRET
  })

  it('token has 7-day expiration', async () => {
    const before = Math.floor(Date.now() / 1000)
    const token = await signJWT({ uid: 'oh' })
    const payload = await verifyJWT(token)
    const expectedExp = before + 60 * 60 * 24 * 7
    expect(payload.exp).toBeGreaterThanOrEqual(expectedExp - 5)
    expect(payload.exp).toBeLessThanOrEqual(expectedExp + 5)
  })
})
