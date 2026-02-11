'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/lib/types'

export function useMessages(linkId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const supabase = createClient()

  const fetchMessages = useCallback(async (cursor?: string) => {
    if (!linkId) return

    let query = supabase
      .from('messages')
      .select('*')
      .eq('link_id', linkId)
      .order('created_at', { ascending: true })
      .limit(50)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data } = await query

    if (data) {
      if (cursor) {
        setMessages(prev => [...data, ...prev])
      } else {
        setMessages(data)
      }
      setHasMore(data.length === 50)
    }

    setLoading(false)
  }, [linkId, supabase])

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message])
  }, [])

  return { messages, loading, hasMore, fetchMessages, addMessage, setMessages }
}
