interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <svg className="animate-spin" viewBox="0 0 24 24" fill="none">
        <circle
          className="opacity-25"
          cx="12" cy="12" r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>
  )
}
