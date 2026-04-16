import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import PortfolioView from './PortfolioView'

export default function PortfolioPage({ params }: { params: { basePath: string } }) {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 min-h-[60vh]">
        <PortfolioView basePath={params.basePath} />
      </main>
      <Footer />
    </>
  )
}
