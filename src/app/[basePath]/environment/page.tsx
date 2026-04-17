import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import EnvironmentView from './EnvironmentView'

export default function EnvironmentPage() {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 min-h-[60vh]">
        <EnvironmentView />
      </main>
      <Footer />
    </>
  )
}
