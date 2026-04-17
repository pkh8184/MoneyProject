'use client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { strings } from '@/lib/strings/ko'

export default function Footer() {
  const params = useParams()
  const basePath = (params?.basePath as string) || ''

  return (
    <footer className="mt-12 pb-[120px] px-4 text-xs text-text-secondary-light dark:text-text-secondary-dark">
      <div className="max-w-6xl mx-auto leading-relaxed">
        <div className="mb-3">
          <Link href={`/${basePath}/glossary`} className="underline">
            {strings.footer.glossaryLinkLabel}
          </Link>
          <Link href={`/${basePath}/environment/backtest`} className="underline ml-3">
            📊 백테스트 결과
          </Link>
        </div>
        {strings.legal.disclaimer}
      </div>
    </footer>
  )
}
