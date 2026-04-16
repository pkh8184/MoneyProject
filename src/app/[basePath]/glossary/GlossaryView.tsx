'use client'
import { useMemo, useState } from 'react'
import { glossaryTerms, type GlossaryCategory } from '@/lib/glossary/terms'
import { strings } from '@/lib/strings/ko'

const CATEGORIES: (GlossaryCategory | '전체')[] = [
  '전체', '기본 용어', '수익 관련', '시장 흐름', '기술 분석', '투자 주체'
]

export default function GlossaryView() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<GlossaryCategory | '전체'>('전체')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return glossaryTerms.filter((t) => {
      if (category !== '전체' && t.category !== category) return false
      if (q && !t.term.toLowerCase().includes(q) && !t.body.toLowerCase().includes(q)) return false
      return true
    })
  }, [search, category])

  return (
    <>
      <h1 className="text-xl font-bold mb-4">{strings.glossary.pageTitle}</h1>

      <input
        type="text"
        placeholder={strings.glossary.searchPlaceholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-3 px-3 py-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark"
      />

      <div className="flex gap-2 mb-5 flex-wrap text-sm">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`px-3 py-1 rounded-full ${
              category === c
                ? 'bg-accent-light dark:bg-accent-dark text-white'
                : 'bg-bg-secondary-light dark:bg-bg-secondary-dark'
            }`}
          >
            {c === '전체' ? strings.glossary.categoryAll : c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-text-secondary-light dark:text-text-secondary-dark">
          {strings.glossary.empty}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <div key={t.term} className="p-4 rounded-2xl bg-bg-secondary-light dark:bg-bg-secondary-dark">
              <h3 className="font-bold mb-1">{t.term}</h3>
              <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-1">{t.category}</p>
              <p className="text-sm whitespace-pre-line">{t.body}</p>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
