'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { BlackholeVortex } from './BlackholeVortex'
import { BlackholeParticles } from './BlackholeParticles'
import { BlackholeGlow } from './BlackholeGlow'
import { MessageIntoBlackhole } from './MessageIntoBlackhole'
import { MessageFromBlackhole } from './MessageFromBlackhole'
import { MessageStatusIndicator } from './MessageStatusIndicator'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { ReplayTimeline } from '@/components/replay/ReplayTimeline'
import { useMessages } from '@/lib/hooks/useMessages'
import { useRealtime } from '@/lib/hooks/useRealtime'
import type { Message, Profile, UserLink } from '@/lib/types'

const HOVER_DURATION = 15_000
const STAGGER_DELAY = 800

interface BlackholeSceneProps {
  userId: string
  partner: Profile
  link: UserLink
  initialMessages: Message[]
  pendingDeliveryMessages?: Message[]
}

interface AnimatingMessage {
  id: string
  message: Message
  direction: 'in' | 'out'
  phase: 'entering' | 'hovering' | 'exiting'
  angle: number // radians — radial direction for received messages
}

function randomAngle(): number {
  return Math.random() * Math.PI * 2
}

export function BlackholeScene({
  userId,
  partner,
  link,
  initialMessages,
  pendingDeliveryMessages = [],
}: BlackholeSceneProps) {
  const { messages, addMessage, updateMessage } = useMessages(link.id, initialMessages)
  const [animatingMessages, setAnimatingMessages] = useState<AnimatingMessage[]>([])
  const displayedIds = useRef<Set<string>>(new Set(initialMessages.map(m => m.id)))
  const hoverTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const staggerTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const [replayMode, setReplayMode] = useState(false)
  const [replayMessage, setReplayMessage] = useState<Message | null>(null)

  // --- Staggered offline message delivery ---
  useEffect(() => {
    if (pendingDeliveryMessages.length === 0) return

    const ids = pendingDeliveryMessages.map(m => m.id)
    fetch('/api/messages/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageIds: ids, status: 'delivered' }),
    })

    pendingDeliveryMessages.forEach((msg, index) => {
      const timer = setTimeout(() => {
        if (displayedIds.current.has(msg.id)) return
        displayedIds.current.add(msg.id)
        addMessage(msg)
        setAnimatingMessages(prev => [
          ...prev,
          { id: msg.id, message: msg, direction: 'out' as const, phase: 'entering' as const, angle: randomAngle() },
        ])
      }, index * STAGGER_DELAY)
      staggerTimers.current.push(timer)
    })

    return () => {
      staggerTimers.current.forEach(clearTimeout)
      staggerTimers.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Phase transitions ---

  const handleEnterComplete = useCallback((animId: string, direction: 'in' | 'out') => {
    if (direction === 'in') {
      setAnimatingMessages(prev => prev.filter(a => a.id !== animId))
      return
    }

    fetch('/api/messages/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageIds: [animId], status: 'read' }),
    })

    setAnimatingMessages(prev =>
      prev.map(a => (a.id === animId ? { ...a, phase: 'hovering' as const } : a))
    )

    const timer = setTimeout(() => {
      hoverTimers.current.delete(animId)
      setAnimatingMessages(prev =>
        prev.map(a => (a.id === animId ? { ...a, phase: 'exiting' as const } : a))
      )
    }, HOVER_DURATION)

    hoverTimers.current.set(animId, timer)
  }, [])

  const handleExitComplete = useCallback((animId: string) => {
    setAnimatingMessages(prev => prev.filter(a => a.id !== animId))
  }, [])

  // --- Realtime handlers ---

  const handleNewRealtimeMessage = useCallback((message: Message) => {
    if (displayedIds.current.has(message.id)) return
    displayedIds.current.add(message.id)
    addMessage(message)

    fetch('/api/messages/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageIds: [message.id], status: 'delivered' }),
    })

    setAnimatingMessages(prev => [
      ...prev,
      { id: message.id, message, direction: 'out', phase: 'entering', angle: randomAngle() },
    ])
  }, [addMessage])

  const handleMessageUpdated = useCallback((updated: Message) => {
    updateMessage(updated)
  }, [updateMessage])

  useRealtime(link.id, userId, handleNewRealtimeMessage, handleMessageUpdated)

  // --- Sent / Replay handlers ---

  const handleReplayAnimationComplete = useCallback(() => {
    setReplayMessage(null)
  }, [])

  const handleMessageSent = useCallback((message: Message) => {
    displayedIds.current.add(message.id)
    addMessage(message)
    setAnimatingMessages(prev => [
      ...prev,
      { id: message.id, message, direction: 'in', phase: 'entering', angle: 0 },
    ])
  }, [addMessage])

  const handleReplaySeek = useCallback((message: Message | null) => {
    if (!message) {
      setReplayMessage(null)
      return
    }
    setReplayMessage(message)
  }, [])

  const handleReplayModeChange = useCallback((active: boolean) => {
    setReplayMode(active)
    if (!active) {
      setReplayMessage(null)
    }
  }, [])

  // --- Derived state ---

  const totalMessages = messages.length

  const outgoingAnimations = animatingMessages.filter(a => a.direction === 'out')
  const enteringSentMessages = animatingMessages.filter(a => a.phase === 'entering' && a.direction === 'in')

  return (
    <div className="relative h-[calc(100vh-56px)] w-full flex flex-col overflow-hidden">
      {/* Status bar */}
      <div className="w-full max-w-lg mx-auto px-4 pt-3 pb-1 shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-xs text-foreground/30">
            Linked with {partner.display_name || 'your partner'}
          </p>
          <p className="text-xs text-foreground/20">
            {totalMessages} message{totalMessages !== 1 ? 's' : ''} in the void
          </p>
        </div>
      </div>

      {/* Blackhole — fills remaining space, centered */}
      <div className="flex-1 flex items-center justify-center relative min-h-0">
        <div className="relative flex items-center justify-center">
          <BlackholeGlow />
          <BlackholeParticles />
          <BlackholeVortex />

          {/* Received messages — single DOM node across all phases (entering → hovering → exiting) */}
          {outgoingAnimations.map(anim => (
            <MessageFromBlackhole
              key={anim.id}
              angle={anim.angle}
              phase={anim.phase}
              onEnterComplete={() => handleEnterComplete(anim.id, 'out')}
              onExitComplete={() => handleExitComplete(anim.id)}
            >
              <div className="bg-surface-light/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-white/90 max-w-[200px] border border-border/50">
                {anim.message.message_type === 'text' ? anim.message.content : `[${anim.message.message_type}]`}
              </div>
            </MessageFromBlackhole>
          ))}

          {/* Sent messages entering the blackhole */}
          {enteringSentMessages.map(anim => {
            const liveStatus = messages.find(m => m.id === anim.id)?.status ?? 'sent'

            return (
              <MessageIntoBlackhole
                key={anim.id}
                onComplete={() => handleEnterComplete(anim.id, 'in')}
              >
                <div className="bg-neon-violet/20 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-white/90 max-w-[180px] truncate border border-neon-violet/30 flex items-end gap-0.5">
                  <span>{anim.message.message_type === 'text' ? anim.message.content : `[${anim.message.message_type}]`}</span>
                  <MessageStatusIndicator status={liveStatus} />
                </div>
              </MessageIntoBlackhole>
            )
          })}

          {/* Replay animation */}
          {replayMessage && (
            replayMessage.sender_id === userId ? (
              <MessageIntoBlackhole
                key={`replay-${replayMessage.id}`}
                onComplete={handleReplayAnimationComplete}
              >
                <div className="bg-neon-violet/20 backdrop-blur-sm px-3 py-2 rounded-lg text-xs text-white/90 max-w-[200px] border border-neon-violet/30">
                  {replayMessage.message_type === 'text' ? replayMessage.content : `[${replayMessage.message_type}]`}
                </div>
              </MessageIntoBlackhole>
            ) : (
              <MessageFromBlackhole
                key={`replay-${replayMessage.id}`}
                angle={randomAngle()}
                phase="entering"
                onEnterComplete={handleReplayAnimationComplete}
              >
                <div className="bg-surface-light/60 backdrop-blur-sm px-3 py-2 rounded-lg text-xs text-white/90 max-w-[200px] border border-border/50">
                  {replayMessage.message_type === 'text' ? replayMessage.content : `[${replayMessage.message_type}]`}
                </div>
              </MessageFromBlackhole>
            )
          )}
        </div>

      </div>

      {/* Bottom bar — fixed height, never shifts */}
      <div className="w-full max-w-lg mx-auto px-4 pb-4 pt-2 shrink-0">
        {!replayMode && (
          <ChatInterface
            linkId={link.id}
            userId={userId}
            partnerId={partner.id}
            onMessageSent={handleMessageSent}
          />
        )}

        {totalMessages > 0 && (
          <div className="mt-2">
            <ReplayTimeline
              messages={messages}
              userId={userId}
              onSeek={handleReplaySeek}
              onReplayModeChange={handleReplayModeChange}
              replayMode={replayMode}
            />
          </div>
        )}
      </div>
    </div>
  )
}
