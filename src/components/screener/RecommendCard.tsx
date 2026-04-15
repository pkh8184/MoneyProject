'use client'

import Link from 'next/link'
import type { FilterResult } from '@/lib/filter'

interface Props {
  result: FilterResult
  tagLabel: string
  basePath: string
}

export default function RecommendCard({ result, tagLabel, basePath }: Props) {
  return (
    <Link
      href={`/${basePath}/stock/${result.code}`}
      className="block bg-bg-secondary-light dark:bg-bg-secondary-dark rounded-xl p-4 hover:shadow-md transition"
    >
      <div className="text-xs text-accent-light dark:text-accent-dark font-bold mb-1">
        🟢 {tagLabel}
      </div>
      <div className="font-bold text-base">{result.name}</div>
      <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-2">
        {result.code} · {result.market}
      </div>
      <div className="text-lg font-bold">
        {result.price?.toLocaleString() ?? '-'}원
      </div>
    </Link>
  )
}
