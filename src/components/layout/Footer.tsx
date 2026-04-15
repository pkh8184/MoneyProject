import { strings } from '@/lib/strings/ko'

export default function Footer() {
  return (
    <footer className="mt-12 pb-[120px] px-4 text-xs text-text-secondary-light dark:text-text-secondary-dark">
      <div className="max-w-6xl mx-auto leading-relaxed">
        {strings.legal.disclaimer}
      </div>
    </footer>
  )
}
