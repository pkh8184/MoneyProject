/**
 * 환경 변수에서 등록된 사용자 정보를 읽고 검증.
 * USER_<KEY>_ID, USER_<KEY>_HASH 쌍을 찾아 반환.
 */
export interface RegisteredUser {
  id: string
  hash: string
  key: string
}

export function getRegisteredUsers(): RegisteredUser[] {
  const users: RegisteredUser[] = []
  for (const envKey of Object.keys(process.env)) {
    const match = envKey.match(/^USER_(.+)_ID$/)
    if (!match) continue
    const key = match[1]
    const id = process.env[envKey]
    const hash = process.env[`USER_${key}_HASH`]
    if (!id || !hash) continue
    users.push({ id, hash, key })
  }
  return users
}

export function findUserById(id: string): RegisteredUser | undefined {
  return getRegisteredUsers().find((u) => u.id === id)
}

export function getSecretBasePath(): string {
  const p = process.env.SECRET_BASE_PATH
  if (!p) throw new Error('SECRET_BASE_PATH env is required')
  return p
}

export function isSiteEnabled(): boolean {
  return process.env.SITE_ENABLED !== 'false'
}
