'use client'

import { useEffect, useState } from 'react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

let addToastFn: ((toast: Omit<Toast, 'id'>) => void) | null = null

export function toast(message: string, type: Toast['type'] = 'info') {
  addToastFn?.({ message, type })
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    addToastFn = ({ message, type }) => {
      const id = Math.random().toString(36).slice(2)
      setToasts(prev => [...prev, { id, message, type }])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 4000)
    }
    return () => { addToastFn = null }
  }, [])

  const typeStyles = {
    success: 'border-green-500/50 bg-green-950/80',
    error: 'border-red-500/50 bg-red-950/80',
    info: 'border-neon-violet/50 bg-surface/80',
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-xl border backdrop-blur-sm text-sm text-foreground animate-[fadeIn_0.2s_ease-out] ${typeStyles[t.type]}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
