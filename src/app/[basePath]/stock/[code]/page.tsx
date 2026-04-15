import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import StockDetail from './StockDetail'

export default function StockPage({ params }: { params: { basePath: string, code: string } }) {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 min-h-[60vh]">
        <StockDetail code={params.code} basePath={params.basePath} />
      </main>
      <Footer />
    </>
  )
}
