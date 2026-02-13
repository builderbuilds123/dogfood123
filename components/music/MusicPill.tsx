'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import { MusicDrawer } from './MusicDrawer'
import type { SharedSong } from '@/lib/types'

interface MusicPillProps {
  linkId: string
  userId: string
  initialLatestSong: SharedSong | null
}

export function MusicPill({ linkId, userId, initialLatestSong }: MusicPillProps) {
  const [latestSong, setLatestSong] = useState<SharedSong | null>(initialLatestSong)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [glowKey, setGlowKey] = useState(0)

  // Realtime subscription for new shared songs
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
        .channel(`shared-songs:${linkId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'shared_songs', filter: `link_id=eq.${linkId}` },
          (payload) => {
            const newSong = payload.new as SharedSong
            setLatestSong(newSong)
            if (newSong.user_id !== userId) {
              setGlowKey(prev => prev + 1)
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
  }, [linkId, userId])

  const handleSongShared = (song: SharedSong) => {
    setLatestSong(song)
  }

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.button
          key={`music-pill-${glowKey}`}
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-light/40 border border-border/30 backdrop-blur-sm hover:bg-surface-light/60 transition-colors max-w-[140px]"
          initial={{ scale: 1 }}
          animate={{
            scale: [1, 1.02, 1],
          }}
          transition={{
            scale: {
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          }}
          whileTap={{ scale: 0.95 }}
        >
          {latestSong ? (
            <>
              {latestSong.artwork_url ? (
                <img
                  src={latestSong.artwork_url}
                  alt=""
                  className="w-4 h-4 rounded-sm shrink-0"
                />
              ) : (
                <span className="text-xs leading-none shrink-0">🎵</span>
              )}
              <span className="text-[10px] text-foreground/50 leading-none truncate">
                {latestSong.track_name}
              </span>
            </>
          ) : (
            <>
              <motion.span
                className="text-xs leading-none"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🎵
              </motion.span>
              <span className="text-[10px] text-foreground/40 leading-none">share a song</span>
            </>
          )}
        </motion.button>
      </AnimatePresence>

      <MusicDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        linkId={linkId}
        userId={userId}
        onSongShared={handleSongShared}
      />
    </>
  )
}
