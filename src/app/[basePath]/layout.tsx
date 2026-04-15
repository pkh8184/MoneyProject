import { notFound } from 'next/navigation'
import ThemeProvider from '@/components/providers/ThemeProvider'

export default function SecretLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: { basePath: string }
}) {
  const expected = process.env.SECRET_BASE_PATH
  if (!expected || params.basePath !== expected) {
    notFound()
  }
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  )
}
