import { forwardRef } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const variantMap = {
  primary: 'bg-accent-light dark:bg-accent-dark text-white hover:opacity-90 rounded-full',
  secondary: 'bg-bg-secondary-light dark:bg-bg-secondary-dark text-text-primary-light dark:text-text-primary-dark hover:opacity-80 rounded-full',
  ghost: 'bg-transparent text-text-primary-light dark:text-text-primary-dark hover:bg-bg-secondary-light dark:hover:bg-bg-secondary-dark rounded-full'
} as const

const sizeMap = {
  sm: 'min-h-9 px-4 text-sm',
  md: 'min-h-12 px-5 text-base',
  lg: 'min-h-14 px-6 text-base font-bold'
} as const

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center font-medium disabled:opacity-50 ${variantMap[variant]} ${sizeMap[size]} ${className}`}
        {...rest}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
export default Button
