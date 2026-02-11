'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/lib/types'

export function useRealtime(
  linkId: string | null,
  userId: string,
  onNewMessage: (message: Message) => void,
  onMessageUpdated?: (message: Message) => void
) {
  const callbackRef = useRef(onNewMessage)
  callbackRef.current = onNewMessage

  const updateCallbackRef = useRef(onMessageUpdated)
  updateCallbackRef.current = onMessageUpdated

  useEffect(() => {
    if (!linkId) return

    const supabase = createClient()
    let cancelled = false
    let activeChannel: ReturnType<typeof supabase.channel> | null = null

    async function setup() {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return

      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token)
      }
      if (cancelled) return

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
            // Receiver gets new messages from partner
            if (newMessage.sender_id !== userId) {
              callbackRef.current(newMessage)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `link_id=eq.${linkId}`,
          },
          (payload) => {
            const updated = payload.new as Message
            // Sender sees status updates on their sent messages
            if (updated.sender_id === userId && updateCallbackRef.current) {
              updateCallbackRef.current(updated)
            }
          }
        )
        .subscribe((status, err) => {
          console.log('[Realtime] subscription status:', status, err || '')
        })

      activeChannel = channel

      if (cancelled) {
        supabase.removeChannel(channel)
      }
    }

    setup()

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'TOKEN_REFRESHED' && session?.access_token) {
          supabase.realtime.setAuth(session.access_token)
        }
      }
    )

    return () => {
      cancelled = true
      if (activeChannel) {
        supabase.removeChannel(activeChannel)
      }
      authListener.unsubscribe()
    }
  }, [linkId, userId])
}
