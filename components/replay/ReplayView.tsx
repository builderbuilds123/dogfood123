'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { BlackholeVortex } from '@/components/blackhole/BlackholeVortex'
import { BlackholeParticles } from '@/components/blackhole/BlackholeParticles'
import { BlackholeGlow } from '@/components/blackhole/BlackholeGlow'
import { MessageIntoBlackhole } from '@/components/blackhole/MessageIntoBlackhole'
import { MessageFromBlackhole } from '@/components/blackhole/MessageFromBlackhole'
import { Button } from '@/components/ui/Button'
import type { Message } from '@/lib/types'

interface ReplayViewProps {
  messages: Message[]
  userId: string
}

export function ReplayView({ messages, userId }: ReplayViewProps) {
  const [playing, setPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [speed, setSpeed] = useState(1)
  const [animatingMessage, setAnimatingMessage] = useState<Message | null>(null)
  const [replayedMessages, setReplayedMessages] = useState<Message[]>([])
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const playNext = useCallback((index: number) => {
    if (index >= messages.length) {
      setPlaying(false)
      return
    }

    const msg = messages[index]
    setCurrentIndex(index)
    setAnimatingMessage(msg)

    // Calculate delay to next message
    const delay = index < messages.length - 1
      ? Math.min(
          (new Date(messages[index + 1].created_at).getTime() - new Date(msg.created_at).getTime()) / speed,
          3000 / speed
        )
      : 2000

    timeoutRef.current = setTimeout(() => {
      playNext(index + 1)
    }, Math.max(delay, 1600 / speed))
  }, [messages, speed])

  function handlePlay() {
    if (playing) {
      setPlaying(false)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      return
    }

    setPlaying(true)
    setReplayedMessages([])
    setAnimatingMessage(null)
    playNext(0)
  }

  function handleReset() {
    setPlaying(false)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setCurrentIndex(-1)
    setReplayedMessages([])
    setAnimatingMessage(null)
  }

  function handleAnimationComplete() {
    if (animatingMessage) {
      setReplayedMessages(prev => [...prev, animatingMessage])
      setAnimatingMessage(null)
    }
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-4">
        <p className="text-foreground/40 text-lg">No messages to replay yet</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-64px)] p-4">
      {/* Replayed messages */}
      <div className="flex-1 w-full max-w-lg overflow-y-auto px-4 pt-4 pb-2 flex flex-col gap-2">
        {replayedMessages.map(m => (
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
        <BlackholeParticles count={12} />
        <BlackholeVortex size="sm" />

        {animatingMessage && (
          animatingMessage.sender_id === userId ? (
            <MessageIntoBlackhole onComplete={handleAnimationComplete}>
              <div className="bg-neon-violet/30 px-3 py-1.5 rounded-xl text-xs text-white max-w-[150px] truncate border border-neon-violet/40">
                {animatingMessage.message_type === 'text' ? animatingMessage.content : `[${animatingMessage.message_type}]`}
              </div>
            </MessageIntoBlackhole>
          ) : (
            <MessageFromBlackhole onComplete={handleAnimationComplete}>
              <div className="bg-surface-light px-3 py-1.5 rounded-xl text-xs text-white max-w-[150px] truncate border border-border">
                {animatingMessage.message_type === 'text' ? animatingMessage.content : `[${animatingMessage.message_type}]`}
              </div>
            </MessageFromBlackhole>
          )
        )}
      </div>

      {/* Controls */}
      <div className="w-full max-w-lg px-4 pb-4 flex flex-col gap-3 shrink-0">
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-surface-light rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-neon-magenta to-neon-cyan transition-all duration-300"
            style={{ width: `${messages.length > 0 ? ((currentIndex + 1) / messages.length) * 100 : 0}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button size="sm" onClick={handlePlay}>
              {playing ? 'Pause' : 'Play'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Reset
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground/40">Speed:</span>
            {[1, 2, 5, 10].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                  speed === s
                    ? 'bg-neon-violet/20 text-neon-cyan'
                    : 'text-foreground/40 hover:text-foreground/60'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <span className="text-xs text-foreground/30">
            {currentIndex + 1} / {messages.length}
          </span>
        </div>
      </div>
    </div>
  )
}
