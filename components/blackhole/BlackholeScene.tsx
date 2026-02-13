'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
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
import { MoodOrb } from '@/components/mood/MoodOrb'
import { StreakBadge } from './StreakBadge'
import { WishlistDrawer } from '@/components/wishlist/WishlistDrawer'
import { PhotoDrawer } from '@/components/photos/PhotoDrawer'
import { PingButton } from '@/components/ping/PingButton'
import { QuestionDrawer } from '@/components/questions/QuestionDrawer'
import { MusicPill } from '@/components/music/MusicPill'
import dynamic from 'next/dynamic'
import type { Message, MoodCheckin, Profile, UserLink, WishlistItem, SharedSong, CalendarEvent, WeeklyRecap } from '@/lib/types'

// bundle-dynamic-imports: Heavy drawer components only load when user interacts
const CalendarDrawer = dynamic(() => import('@/components/calendar/CalendarDrawer').then(m => m.CalendarDrawer), { ssr: false })
const RecapDrawer = dynamic(() => import('@/components/recap/RecapDrawer').then(m => m.RecapDrawer), { ssr: false })

const HOVER_DURATION = 15_000
const STAGGER_DELAY = 800

interface BlackholeSceneProps {
  userId: string
  partner: Profile
  link: UserLink
  initialMessages: Message[]
  pendingDeliveryMessages?: Message[]
  initialPartnerMood?: MoodCheckin | null
  initialWishlistItems?: WishlistItem[]
  initialPhotos?: Message[]
  initialUnseenPingCount?: number
  initialLatestSong?: SharedSong | null
  initialNextEvent?: CalendarEvent | null
  initialRecap?: WeeklyRecap | null
  showRecapNotification?: boolean
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

function MessageContent({ message }: { message: Message }) {
  if (message.message_type === 'image' && message.media_url) {
    return (
      <div className="flex items-center gap-1.5">
        <img
          src={message.media_url}
          alt="Photo"
          className="w-10 h-10 object-cover rounded"
        />
        <span className="text-[10px] text-white/50">📷</span>
      </div>
    )
  }
  if (message.message_type === 'audio') {
    return <span>🎤 Voice message</span>
  }
  return <span>{message.content}</span>
}

export function BlackholeScene({
  userId,
  partner,
  link,
  initialMessages,
  pendingDeliveryMessages = [],
  initialPartnerMood = null,
  initialWishlistItems = [],
  initialPhotos = [],
  initialUnseenPingCount = 0,
  initialLatestSong = null,
  initialNextEvent = null,
  initialRecap = null,
  showRecapNotification = false,
}: BlackholeSceneProps) {
  const { messages, addMessage, updateMessage } = useMessages(link.id, initialMessages)
  const [animatingMessages, setAnimatingMessages] = useState<AnimatingMessage[]>([])
  const displayedIds = useRef<Set<string>>(new Set(initialMessages.map(m => m.id)))
  const hoverTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const staggerTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const [replayMode, setReplayMode] = useState(false)
  const [replayMessage, setReplayMessage] = useState<Message | null>(null)
  const [partnerMood, setPartnerMood] = useState<MoodCheckin | null>(initialPartnerMood)

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

  const handleMoodCheckin = useCallback((checkin: MoodCheckin) => {
    if (checkin.user_id !== userId) {
      setPartnerMood(checkin)
    }
  }, [userId])

  // Called after the user submits their own mood (no-op since we only show partner's)
  const handleMoodSubmitted = useCallback((_checkin: MoodCheckin) => {}, [])

  useRealtime(link.id, userId, handleNewRealtimeMessage, handleMessageUpdated, handleMoodCheckin)

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
    <div className="relative h-screen w-full flex flex-col overflow-hidden">
      {/* Status bar */}
      <div className="w-full max-w-lg mx-auto px-4 pt-3 pb-1 shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-xs text-foreground/30">
            Linked with {partner.display_name || 'your partner'}
          </p>
          <div className="flex items-center gap-2">
            <MusicPill
              linkId={link.id}
              userId={userId}
              initialLatestSong={initialLatestSong}
            />
            <p className="text-xs text-foreground/20">
              {totalMessages} message{totalMessages !== 1 ? 's' : ''} in the void
            </p>
            <MoodOrb
              linkId={link.id}
              partnerMood={partnerMood}
              onMoodSubmitted={handleMoodSubmitted}
            />
          </div>
        </div>
      </div>

      {/* Blackhole — fills remaining space, centered */}
      <div className="flex-1 flex items-center justify-center relative min-h-0">
        <div className="relative flex items-center justify-center">
          <BlackholeGlow />
          <BlackholeParticles />
          <BlackholeVortex />
          <StreakBadge linkId={link.id} />

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
                <MessageContent message={anim.message} />
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
                  <MessageContent message={anim.message} />
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
                  <MessageContent message={replayMessage} />
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
                  <MessageContent message={replayMessage} />
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

      {/* Ping button (top-left) */}
      <PingButton
        linkId={link.id}
        userId={userId}
        initialUnseenCount={initialUnseenPingCount}
      />

      {/* Question of the Day (below ping button) */}
      <QuestionDrawer
        linkId={link.id}
        userId={userId}
        partnerName={partner.display_name || 'Partner'}
      />

      {/* Settings button */}
      <Link
        href="/settings"
        className="fixed top-4 right-4 z-30 w-9 h-9 rounded-full bg-surface-light/40 backdrop-blur-md border border-border/30 hover:border-neon-violet/40 flex items-center justify-center text-foreground/30 hover:text-foreground/60 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      </Link>

      {/* Photo drawer (left side) */}
      <PhotoDrawer
        initialPhotos={initialPhotos}
        linkId={link.id}
        userId={userId}
        partnerName={partner.display_name || 'Partner'}
      />

      {/* Wishlist drawer (right side) */}
      <WishlistDrawer
        initialItems={initialWishlistItems}
        linkId={link.id}
        userId={userId}
        partnerName={partner.display_name || 'Partner'}
      />

      {/* Calendar drawer (right side, above wishlist) */}
      <CalendarDrawer
        linkId={link.id}
        userId={userId}
        partnerName={partner.display_name || 'Partner'}
        initialNextEvent={initialNextEvent}
      />

      {/* Weekly recap (left side, above photos) */}
      <RecapDrawer
        linkId={link.id}
        initialRecap={initialRecap}
        showNotification={showRecapNotification}
        partnerName={partner.display_name || 'Partner'}
      />
    </div>
  )
}
