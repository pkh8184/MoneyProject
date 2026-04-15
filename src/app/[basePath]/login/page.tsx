import { strings } from '@/lib/strings/ko'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center pb-[120px] px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {strings.auth.loginTitle}
        </h1>

        <LoginForm />

        <footer className="mt-8 text-xs text-text-secondary-light dark:text-text-secondary-dark leading-relaxed">
          {strings.legal.disclaimer}
        </footer>
      </div>
    </main>
  )
}
