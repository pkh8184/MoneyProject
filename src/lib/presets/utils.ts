/** 배열의 마지막 값. 없거나 null이면 undefined. */
export function latest<T>(arr: (T | null | undefined)[]): T | undefined {
  if (!arr || arr.length === 0) return undefined
  const v = arr[arr.length - 1]
  return v == null ? undefined : v
}

/** 배열의 끝에서 n번째 값 (0=마지막). */
export function prev<T>(arr: (T | null | undefined)[], offset: number): T | undefined {
  if (!arr || arr.length < offset + 1) return undefined
  const v = arr[arr.length - 1 - offset]
  return v == null ? undefined : v
}

/** 모든 값이 유효(null/undefined 아님)하면 true */
export function allValid(...vals: unknown[]): boolean {
  return vals.every((v) => v !== null && v !== undefined)
}
