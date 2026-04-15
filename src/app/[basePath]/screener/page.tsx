import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ScreenerSwitcher from './ScreenerSwitcher'

export default function ScreenerPage() {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 min-h-[60vh]">
        <ScreenerSwitcher />
      </main>
      <Footer />
    </>
  )
}
