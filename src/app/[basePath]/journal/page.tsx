import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import JournalView from './JournalView'

export default function JournalPage({ params }: { params: { basePath: string } }) {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 min-h-[60vh]">
        <JournalView basePath={params.basePath} />
      </main>
      <Footer />
    </>
  )
}
