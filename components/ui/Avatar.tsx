interface AvatarProps {
  src?: string | null
  alt?: string
  persona?: 'doggo' | 'princess' | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
}

export function Avatar({ src, alt, persona, size = 'md', className = '' }: AvatarProps) {
  const emoji = persona === 'doggo' ? '🐕' : persona === 'princess' ? '👸' : '?'

  if (src) {
    return (
      <img
        src={src}
        alt={alt || 'Avatar'}
        className={`${sizeClasses[size]} rounded-full object-cover border-2 border-border ${className}`}
      />
    )
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-surface-light border-2 border-border flex items-center justify-center ${className}`}
    >
      {emoji}
    </div>
  )
}
