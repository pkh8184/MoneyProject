import ModeToggle from './ModeToggle'
import ThemeToggle from './ThemeToggle'
import UpdatedAtBadge from './UpdatedAtBadge'
import LogoutButton from './LogoutButton'
import HeaderNav from './HeaderNav'
import { strings } from '@/lib/strings/ko'

export default function Header() {
  return (
    <header className="sticky top-0 z-10 bg-bg-primary-light dark:bg-bg-primary-dark border-b border-border-light dark:border-border-dark">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg">{strings.app.title}</span>
          <UpdatedAtBadge />
        </div>
        <div className="flex items-center gap-2">
          <HeaderNav />
          <ModeToggle />
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}
