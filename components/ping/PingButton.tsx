'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { createClient } from '@/lib/supabase/client'

interface PingButtonProps {
  linkId: string
  userId: string
  initialUnseenCount?: number
}

export function PingButton({ linkId, userId, initialUnseenCount = 0 }: PingButtonProps) {
  const [cooldown, setCooldown] = useState(false)
  const [sendBounce, setSendBounce] = useState(false)
  const [pulseQueue, setPulseQueue] = useState(initialUnseenCount)
  const [activePulse, setActivePulse] = useState(false)
  const [showCounter, setShowCounter] = useState(false)
  const [counterValue, setCounterValue] = useState(0)
  const pulsingRef = useRef(false)
  const totalPulsesRef = useRef(0)

  // Play accumulated pulses on mount
  useEffect(() => {
    if (initialUnseenCount > 0) {
      totalPulsesRef.current = initialUnseenCount
      setCounterValue(initialUnseenCount)
      playPulseSequence(initialUnseenCount)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const playPulseSequence = useCallback(async (count: number) => {
    if (pulsingRef.current) return
    pulsingRef.current = true

    for (let i = 0; i < count; i++) {
      setActivePulse(true)
      await new Promise(r => setTimeout(r, 400))
      setActivePulse(false)
      await new Promise(r => setTimeout(r, 200))
    }

    // Show counter after pulses
    setShowCounter(true)
    setTimeout(() => {
      setShowCounter(false)
      setCounterValue(0)
      totalPulsesRef.current = 0
    }, 2000)

    // Mark as seen
    fetch('/api/ping/seen', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkId }),
    })

    setPulseQueue(0)
    pulsingRef.current = false
  }, [linkId])

  // Realtime subscription for live pings
  useEffect(() => {
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
        .channel(`pings:${linkId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'pings', filter: `link_id=eq.${linkId}` },
          (payload) => {
            const ping = payload.new as { sender_id: string }
            // Only react to partner's pings
            if (ping.sender_id !== userId) {
              // Play a single pulse immediately
              totalPulsesRef.current = 1
              setCounterValue(1)
              playPulseSequence(1)
            }
          }
        )
        .subscribe()

      activeChannel = channel
      if (cancelled) supabase.removeChannel(channel)
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
      if (activeChannel) supabase.removeChannel(activeChannel)
      authListener.unsubscribe()
    }
  }, [linkId, userId, playPulseSequence])

  const handleSend = useCallback(async () => {
    if (cooldown) return

    setCooldown(true)
    setSendBounce(true)
    setTimeout(() => setSendBounce(false), 300)

    try {
      await fetch('/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId }),
      })
    } catch {
      // Silently fail — it's a ping, not critical
    }

    setTimeout(() => setCooldown(false), 5000)
  }, [cooldown, linkId])

  return (
    <>
      {/* Floating heart button — top-left */}
      <motion.button
        type="button"
        onClick={handleSend}
        disabled={cooldown}
        className={`fixed top-4 left-4 z-30 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md border transition-all ${
          cooldown
            ? 'bg-surface-light/20 border-border/15 text-foreground/15'
            : 'bg-surface-light/40 border-border/30 hover:border-pink-400/40 text-pink-400/70 hover:text-pink-400'
        }`}
        animate={sendBounce ? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 0.3 }}
        title="Thinking of you"
      >
        <span className="text-sm">💓</span>
      </motion.button>

      {/* Heartbeat pulse overlay — covers the blackhole area */}
      <AnimatePresence>
        {activePulse && (
          <motion.div
            className="fixed inset-0 z-20 pointer-events-none flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className="w-48 h-48 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(236,72,153,0.3) 0%, rgba(236,72,153,0.1) 40%, transparent 70%)',
              }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.5], opacity: [0.8, 0] }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating counter — shows after pulse sequence */}
      <AnimatePresence>
        {showCounter && counterValue > 0 && (
          <motion.div
            className="fixed z-25 pointer-events-none"
            style={{ top: '40%', left: '50%', transform: 'translateX(-50%)' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <span className="text-lg font-bold text-pink-400/80 drop-shadow-lg">
              💓 &times;{counterValue}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
