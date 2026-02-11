'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { Message } from '@/lib/types'

interface ReplayTimelineProps {
  messages: Message[]
  userId: string
  onSeek: (message: Message | null) => void
  onReplayModeChange: (active: boolean) => void
  replayMode: boolean
}

export function ReplayTimeline({ messages, userId, onSeek, onReplayModeChange, replayMode }: ReplayTimelineProps) {
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const trackRef = useRef<HTMLDivElement>(null)
  const playTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDragging = useRef(false)

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current)
    }
  }, [])

  // Seek to a specific index and trigger the animation
  const seekTo = useCallback((index: number) => {
    if (index < 0 || index >= messages.length) return
    setCurrentIndex(index)
    onSeek(messages[index])
  }, [messages, onSeek])

  // Handle clicking on the track or dragging the scrubber
  const getIndexFromPosition = useCallback((clientX: number) => {
    if (!trackRef.current || messages.length === 0) return -1
    const rect = trackRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    const ratio = x / rect.width
    return Math.round(ratio * (messages.length - 1))
  }, [messages])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (messages.length === 0) return
    isDragging.current = true

    // Enter replay mode
    if (!replayMode) onReplayModeChange(true)

    // Stop autoplay if running
    if (playing) {
      setPlaying(false)
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current)
    }

    const index = getIndexFromPosition(e.clientX)
    if (index >= 0) seekTo(index)

    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [messages, replayMode, playing, getIndexFromPosition, seekTo, onReplayModeChange])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    const index = getIndexFromPosition(e.clientX)
    if (index >= 0 && index !== currentIndex) {
      seekTo(index)
    }
  }, [getIndexFromPosition, currentIndex, seekTo])

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
  }, [])

  // Autoplay through messages
  const playNext = useCallback((fromIndex: number) => {
    if (fromIndex >= messages.length) {
      setPlaying(false)
      return
    }

    seekTo(fromIndex)

    const delay = fromIndex < messages.length - 1
      ? Math.min(
          (new Date(messages[fromIndex + 1].created_at).getTime() - new Date(messages[fromIndex].created_at).getTime()) / speed,
          3000 / speed
        )
      : 2000

    playTimeoutRef.current = setTimeout(() => {
      playNext(fromIndex + 1)
    }, Math.max(delay, 1800 / speed))
  }, [messages, speed, seekTo])

  function handleTogglePlay() {
    if (!replayMode) onReplayModeChange(true)

    if (playing) {
      setPlaying(false)
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current)
    } else {
      setPlaying(true)
      const startFrom = currentIndex < messages.length - 1 ? currentIndex + 1 : 0
      playNext(startFrom)
    }
  }

  function handleExitReplay() {
    setPlaying(false)
    if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current)
    setCurrentIndex(-1)
    onSeek(null)
    onReplayModeChange(false)
  }

  // Dot positions on the timeline for each message
  const timeRange = messages.length > 1
    ? new Date(messages[messages.length - 1].created_at).getTime() - new Date(messages[0].created_at).getTime()
    : 1

  return (
    <div className="flex flex-col gap-2">
      {/* Timeline track */}
      <div
        ref={trackRef}
        className="relative w-full h-8 cursor-pointer select-none touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Track background */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-surface-light rounded-full" />

        {/* Progress fill */}
        {currentIndex >= 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-gradient-to-r from-neon-magenta to-neon-cyan rounded-full transition-[width] duration-100"
            style={{ width: `${(currentIndex / Math.max(messages.length - 1, 1)) * 100}%` }}
          />
        )}

        {/* Message dots */}
        {messages.map((m, i) => {
          const pos = messages.length > 1
            ? ((new Date(m.created_at).getTime() - new Date(messages[0].created_at).getTime()) / timeRange) * 100
            : 50
          const isActive = i <= currentIndex
          const isSender = m.sender_id === userId

          return (
            <div
              key={m.id}
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full transition-all duration-150 ${
                i === currentIndex
                  ? 'w-3 h-3 shadow-[0_0_8px_rgba(0,255,255,0.6)]'
                  : 'w-1.5 h-1.5'
              } ${
                isActive
                  ? isSender ? 'bg-neon-magenta' : 'bg-neon-cyan'
                  : 'bg-foreground/20'
              }`}
              style={{ left: `${pos}%` }}
            />
          )
        })}

        {/* Scrubber handle */}
        {currentIndex >= 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(0,255,255,0.5)] border-2 border-neon-cyan transition-[left] duration-100"
            style={{ left: `${(currentIndex / Math.max(messages.length - 1, 1)) * 100}%` }}
          />
        )}
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleTogglePlay}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              playing
                ? 'bg-neon-magenta/20 text-neon-magenta border border-neon-magenta/30'
                : 'bg-surface-light text-foreground/60 border border-border hover:border-neon-cyan/40'
            }`}
          >
            {playing ? 'Pause' : 'Replay'}
          </button>
          {replayMode && (
            <button
              onClick={handleExitReplay}
              className="px-3 py-1 text-xs rounded-full text-foreground/40 hover:text-foreground/60 transition-colors"
            >
              Exit
            </button>
          )}
        </div>

        {/* Speed controls — only show in replay mode */}
        {replayMode && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-foreground/30 mr-1">Speed</span>
            {[1, 2, 5, 10].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                  speed === s
                    ? 'bg-neon-violet/20 text-neon-cyan'
                    : 'text-foreground/30 hover:text-foreground/50'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        )}

        <span className="text-[10px] text-foreground/20">
          {currentIndex >= 0 ? `${currentIndex + 1}/` : ''}{messages.length}
        </span>
      </div>
    </div>
  )
}
