'use client'

import { useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/lib/types'

export function useRealtime(
  linkId: string | null,
  userId: string,
  onNewMessage: (message: Message) => void
) {
  const supabase = createClient()
  const callbackRef = useRef(onNewMessage)
  callbackRef.current = onNewMessage

  useEffect(() => {
    if (!linkId) return

    const channel = supabase
      .channel(`messages:${linkId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `link_id=eq.${linkId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message
          if (newMessage.sender_id !== userId) {
            callbackRef.current(newMessage)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [linkId, userId, supabase])
}
