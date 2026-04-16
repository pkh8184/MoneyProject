import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import WatchlistView from './WatchlistView'

export default function WatchlistPage({ params }: { params: { basePath: string } }) {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 min-h-[60vh]">
        <WatchlistView basePath={params.basePath} />
      </main>
      <Footer />
    </>
  )
}
