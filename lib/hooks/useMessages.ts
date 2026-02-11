'use client'

import { useState, useCallback } from 'react'
import type { Message } from '@/lib/types'

export function useMessages(linkId: string | undefined, initialMessages: Message[] = []) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => {
      // Avoid duplicates
      if (prev.some(m => m.id === message.id)) return prev
      return [...prev, message]
    })
  }, [])

  const updateMessage = useCallback((updated: Message) => {
    setMessages(prev =>
      prev.map(m => m.id === updated.id ? { ...m, status: updated.status } : m)
    )
  }, [])

  return { messages, addMessage, updateMessage, setMessages }
}
