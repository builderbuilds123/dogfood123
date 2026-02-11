import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean
}

export function Card({ className = '', glow, children, ...props }: CardProps) {
  return (
    <div
      className={`bg-surface/80 backdrop-blur-sm border border-border rounded-2xl p-6 ${glow ? 'shadow-[0_0_30px_rgba(139,0,255,0.15)]' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
