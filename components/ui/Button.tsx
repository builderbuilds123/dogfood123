import { forwardRef, type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neon-violet/50 disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary: 'bg-neon-violet/80 text-white hover:bg-neon-violet hover:shadow-[0_0_20px_rgba(139,0,255,0.4)]',
      secondary: 'bg-surface-light text-white border border-border hover:border-neon-violet/50 hover:shadow-[0_0_15px_rgba(139,0,255,0.2)]',
      ghost: 'text-foreground/70 hover:text-foreground hover:bg-white/5',
      danger: 'bg-red-600/80 text-white hover:bg-red-600 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-5 py-2.5 text-sm gap-2',
      lg: 'px-7 py-3 text-base gap-2.5',
    }

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export { Button }
