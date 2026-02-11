'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { BlackholeVortex } from './BlackholeVortex'
import { BlackholeParticles } from './BlackholeParticles'
import { BlackholeGlow } from './BlackholeGlow'
import { MessageIntoBlackhole } from './MessageIntoBlackhole'
import { MessageFromBlackhole } from './MessageFromBlackhole'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { useMessages } from '@/lib/hooks/useMessages'
import { useRealtime } from '@/lib/hooks/useRealtime'
import type { Message, Profile, UserLink } from '@/lib/types'

interface BlackholeSceneProps {
  userId: string
  partner: Profile
  link: UserLink
}

interface AnimatingMessage {
  id: string
  message: Message
  direction: 'in' | 'out'
}

export function BlackholeScene({ userId, partner, link }: BlackholeSceneProps) {
  const { messages, loading, fetchMessages, addMessage } = useMessages(link.id)
  const [animatingMessages, setAnimatingMessages] = useState<AnimatingMessage[]>([])
  const sceneRef = useRef<HTMLDivElement>(null)
  const hasFetched = useRef(false)

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true
      fetchMessages()
    }
  }, [fetchMessages])

  const handleNewRealtimeMessage = useCallback((message: Message) => {
    setAnimatingMessages(prev => [
      ...prev,
      { id: message.id, message, direction: 'out' },
    ])
  }, [])

  useRealtime(link.id, userId, handleNewRealtimeMessage)

  const handleSendAnimation = useCallback((message: Message) => {
    setAnimatingMessages(prev => [
      ...prev,
      { id: message.id, message, direction: 'in' },
    ])
  }, [])

  const handleAnimationComplete = useCallback((animId: string, message: Message) => {
    setAnimatingMessages(prev => prev.filter(a => a.id !== animId))
    addMessage(message)
  }, [addMessage])

  const handleMessageSent = useCallback((message: Message) => {
    handleSendAnimation(message)
    // Also add to list immediately for the sender
    setTimeout(() => {
      addMessage(message)
    }, 1500)
  }, [handleSendAnimation, addMessage])

  return (
    <div ref={sceneRef} className="relative flex flex-col items-center min-h-[calc(100vh-64px)] w-full">
      {/* Incoming messages area */}
      <div className="flex-1 w-full max-w-lg overflow-y-auto px-4 pt-4 pb-2 flex flex-col gap-2">
        {messages.filter(m => m.sender_id !== userId).length === 0 && !loading && (
          <p className="text-center text-foreground/30 text-sm mt-4">
            Messages from {partner.display_name || 'your partner'} will appear here
          </p>
        )}
        {messages.map(m => (
          <div
            key={m.id}
            className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
              m.sender_id === userId
                ? 'ml-auto bg-neon-violet/20 border border-neon-violet/30'
                : 'mr-auto bg-surface-light border border-border'
            }`}
          >
            {m.message_type === 'text' && <p>{m.content}</p>}
            {m.message_type === 'image' && m.media_url && (
              <img src={m.media_url} alt="Shared image" className="rounded-lg max-w-full max-h-48 object-cover" />
            )}
            {m.message_type === 'audio' && m.media_url && (
              <audio controls src={m.media_url} className="max-w-full" />
            )}
            <span className="text-[10px] text-foreground/30 mt-1 block">
              {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>

      {/* Blackhole */}
      <div className="relative flex items-center justify-center py-4 shrink-0">
        <BlackholeGlow />
        <BlackholeParticles />
        <BlackholeVortex />

        {/* Animating messages */}
        {animatingMessages.map(anim => (
          anim.direction === 'in' ? (
            <MessageIntoBlackhole
              key={anim.id}
              onComplete={() => handleAnimationComplete(anim.id, anim.message)}
            >
              <div className="bg-neon-violet/30 px-3 py-1.5 rounded-xl text-xs text-white max-w-[150px] truncate border border-neon-violet/40">
                {anim.message.message_type === 'text' ? anim.message.content : `[${anim.message.message_type}]`}
              </div>
            </MessageIntoBlackhole>
          ) : (
            <MessageFromBlackhole
              key={anim.id}
              onComplete={() => handleAnimationComplete(anim.id, anim.message)}
            >
              <div className="bg-surface-light px-3 py-1.5 rounded-xl text-xs text-white max-w-[150px] truncate border border-border">
                {anim.message.message_type === 'text' ? anim.message.content : `[${anim.message.message_type}]`}
              </div>
            </MessageFromBlackhole>
          )
        ))}
      </div>

      {/* Chat input */}
      <div className="w-full max-w-lg px-4 pb-4 shrink-0">
        <ChatInterface
          linkId={link.id}
          userId={userId}
          partnerId={partner.id}
          onMessageSent={handleMessageSent}
        />
      </div>
    </div>
  )
}
