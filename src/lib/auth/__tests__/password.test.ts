import { describe, it, expect } from 'vitest'
import bcrypt from 'bcryptjs'
import { verifyPassword } from '../password'

describe('verifyPassword', () => {
  it('returns true for correct password', async () => {
    const hash = await bcrypt.hash('correct_password', 12)
    const result = await verifyPassword('correct_password', hash)
    expect(result).toBe(true)
  })

  it('returns false for wrong password', async () => {
    const hash = await bcrypt.hash('correct_password', 12)
    const result = await verifyPassword('wrong_password', hash)
    expect(result).toBe(false)
  })

  it('returns false for empty password', async () => {
    const hash = await bcrypt.hash('correct_password', 12)
    const result = await verifyPassword('', hash)
    expect(result).toBe(false)
  })

  it('returns false for invalid hash', async () => {
    const result = await verifyPassword('anything', 'not_a_valid_hash')
    expect(result).toBe(false)
  })
})
