interface PillProps {
  children: React.ReactNode
  variant?: 'neutral' | 'accent' | 'positive' | 'negative'
  className?: string
}

const variantMap = {
  neutral: 'bg-bg-primary-light dark:bg-bg-primary-dark text-text-secondary-light dark:text-text-secondary-dark border border-border-light dark:border-border-dark',
  accent: 'bg-accent-light dark:bg-accent-dark text-white',
  positive: 'bg-positive-light dark:bg-positive-dark text-white',
  negative: 'bg-negative-light dark:bg-negative-dark text-white'
} as const

export default function Pill({ children, variant = 'neutral', className = '' }: PillProps) {
  return (
    <span className={`inline-flex items-center px-3 py-1 text-sm rounded-full ${variantMap[variant]} ${className}`}>
      {children}
    </span>
  )
}
