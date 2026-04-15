import { strings } from '@/lib/strings/ko'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center pb-[120px] px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-hero mb-2 text-center">
          {strings.app.title}
        </h1>
        <p className="text-center text-text-secondary-light dark:text-text-secondary-dark mb-10">
          로그인
        </p>

        <LoginForm />

        <footer className="mt-10 text-sm text-text-secondary-light dark:text-text-secondary-dark leading-relaxed text-center">
          {strings.legal.disclaimer}
        </footer>
      </div>
    </main>
  )
}
