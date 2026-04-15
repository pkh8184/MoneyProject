import ThemeToggle from './ThemeToggle'
import UpdatedAtBadge from './UpdatedAtBadge'
import SideNav from './SideNav'
import { strings } from '@/lib/strings/ko'

export default function Header() {
  return (
    <header className="sticky top-0 z-10 bg-bg-primary-light dark:bg-bg-primary-dark">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SideNav />
          <span className="font-bold text-lg">{strings.app.title}</span>
          <UpdatedAtBadge />
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
