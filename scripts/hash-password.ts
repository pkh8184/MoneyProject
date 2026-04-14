#!/usr/bin/env tsx
/**
 * 비밀번호 해시 생성 유틸.
 * 사용: npm run hash-password -- "내비번"
 * 출력: bcrypt 해시 (cost factor 12)
 */
import bcrypt from 'bcryptjs'

async function main() {
  const password = process.argv[2]
  if (!password) {
    console.error('Usage: npm run hash-password -- "<password>"')
    process.exit(1)
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.')
    process.exit(1)
  }
  const hash = await bcrypt.hash(password, 12)
  console.log(hash)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
