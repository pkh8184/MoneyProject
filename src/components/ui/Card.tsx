import { forwardRef } from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg'
  interactive?: boolean
}

const paddingMap = { sm: 'p-4', md: 'p-6', lg: 'p-8' } as const

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = 'md', interactive = false, className = '', children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-bg-secondary-light dark:bg-bg-secondary-dark rounded-2xl shadow-soft ${
          interactive ? 'cursor-pointer hover:shadow-soft-md' : ''
        } ${paddingMap[padding]} ${className}`}
        {...rest}
      >
        {children}
      </div>
    )
  }
)
Card.displayName = 'Card'
export default Card
