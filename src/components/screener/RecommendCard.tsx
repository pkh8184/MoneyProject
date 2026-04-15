'use client'

import Link from 'next/link'
import type { FilterResult } from '@/lib/filter'
import Card from '@/components/ui/Card'

interface Props {
  result: FilterResult
  tagLabel: string
  basePath: string
}

export default function RecommendCard({ result, tagLabel, basePath }: Props) {
  return (
    <Link href={`/${basePath}/stock/${result.code}`} className="block">
      <Card interactive padding="md">
        <div className="text-sm text-accent-light dark:text-accent-dark font-bold mb-2">
          🟢 {tagLabel}
        </div>
        <div className="font-bold text-lg">{result.name}</div>
        <div className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-2">
          {result.code} · {result.market}
        </div>
        <div className="text-2xl font-bold">
          {result.price?.toLocaleString() ?? '-'}원
        </div>
      </Card>
    </Link>
  )
}
