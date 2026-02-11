'use client'

interface MessageStatusIndicatorProps {
  status: 'sent' | 'delivered' | 'read'
}

export function MessageStatusIndicator({ status }: MessageStatusIndicatorProps) {
  if (status === 'sent') {
    // Single checkmark — dim
    return (
      <svg
        className="inline-block ml-1 text-foreground/30"
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 8.5 L6.5 12 L13 4" />
      </svg>
    )
  }

  // Double checkmark — brighter for delivered, neon-violet for read
  const colorClass = status === 'read' ? 'text-neon-violet/70' : 'text-foreground/40'

  return (
    <svg
      className={`inline-block ml-1 ${colorClass}`}
      width="16"
      height="12"
      viewBox="0 0 20 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 8.5 L4.5 12 L11 4" />
      <path d="M6 8.5 L9.5 12 L16 4" />
    </svg>
  )
}
