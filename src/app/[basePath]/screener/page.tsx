import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { strings } from '@/lib/strings/ko'

export default function ScreenerPage() {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 min-h-[60vh]">
        <h2 className="text-xl font-bold mb-4">
          {strings.screener.beginnerTitle}
        </h2>
        <p className="text-text-secondary-light dark:text-text-secondary-dark">
          Phase 4에서 프리셋 필터링 결과가 여기에 표시됩니다.
        </p>
      </main>
      <Footer />
    </>
  )
}
