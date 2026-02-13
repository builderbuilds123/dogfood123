'use client'

import { useState, useEffect, memo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui/Toast'
import type { WeeklyRecap, WeeklyRecapStats } from '@/lib/types'

interface RecapDrawerProps {
  linkId: string
  initialRecap: WeeklyRecap | null
  showNotification: boolean
  partnerName: string
}

const STAT_ITEMS: { key: keyof WeeklyRecapStats; label: string; emoji: string }[] = [
  { key: 'messages_count', label: 'Messages', emoji: '\u{1F4AC}' },
  { key: 'streak', label: 'Streak', emoji: '\u{1F525}' },
  { key: 'pings_sent', label: 'Pings', emoji: '\u{1F493}' },
  { key: 'photos_shared', label: 'Photos', emoji: '\u{1F4F7}' },
  { key: 'songs_shared', label: 'Songs', emoji: '\u{1F3B5}' },
  { key: 'wishlist_completed', label: 'Wishes done', emoji: '\u2705' },
  { key: 'questions_answered', label: 'Questions', emoji: '\u2753' },
  { key: 'events_added', label: 'Events', emoji: '\u{1F4C5}' },
]

function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart + 'T00:00:00')
  const end = new Date(weekEnd + 'T00:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} \u2013 ${end.toLocaleDateString('en-US', opts)}`
}

/** Memoized RecapCard -- recap prop changes infrequently */
const RecapCard = memo(function RecapCard({ recap, isLatest = false }: { recap: WeeklyRecap; isLatest?: boolean }) {
  const stats = recap.stats as unknown as WeeklyRecapStats
  const moodsUsed = stats.moods_used || []

  return (
    <div
      className={`relative rounded-2xl p-4 ${
        isLatest
          ? 'recap-latest-card bg-gradient-to-br from-neon-magenta/8 to-neon-cyan/8'
          : 'border border-neon-violet/30 bg-gradient-to-br from-neon-magenta/5 to-neon-cyan/5'
      }`}
    >
      <p className="text-[10px] text-foreground/30 mb-1">Week of</p>
      <p className="text-sm font-bold text-foreground/70 mb-3">
        {formatWeekRange(recap.week_start, recap.week_end)}
      </p>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {STAT_ITEMS.map((item, i) => {
          const value = stats[item.key]
          const numValue = typeof value === 'number' ? value : 0

          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${
                numValue > 0
                  ? 'bg-surface-light/30 border border-border/25 border-l-2 border-l-neon-cyan/40'
                  : 'bg-surface-light/10 border border-border/10'
              }`}
            >
              <span className="text-xs">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <span className={`text-xs tabular-nums ${numValue > 0 ? 'text-foreground/60 font-medium' : 'text-foreground/20'}`}>
                  {numValue}
                </span>
                <span className={`text-[9px] ml-1 ${numValue > 0 ? 'text-foreground/30' : 'text-foreground/15'}`}>
                  {item.label}
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Moods used -- ternary conditional render */}
      {moodsUsed.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-3 pt-2 border-t border-border/15"
        >
          <p className="text-[9px] text-foreground/25 mb-1">Moods this week</p>
          <div className="flex gap-1">
            {moodsUsed.map((emoji, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.45 + i * 0.06, type: 'spring', stiffness: 400, damping: 15 }}
                className="text-base"
              >
                {emoji}
              </motion.span>
            ))}
          </div>
        </motion.div>
      ) : null}
    </div>
  )
})

export function RecapDrawer({ linkId, initialRecap, showNotification, partnerName }: RecapDrawerProps) {
  const [open, setOpen] = useState(false)
  const [recap, setRecap] = useState<WeeklyRecap | null>(initialRecap)
  const [pastRecaps, setPastRecaps] = useState<WeeklyRecap[]>([])
  const [loadedPast, setLoadedPast] = useState(false)
  // Lazy state initializer to avoid recomputing on every render
  const [showBanner, setShowBanner] = useState(() => showNotification && !!initialRecap)

  // Realtime subscription for new recaps
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
        .channel(`recaps:${linkId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'weekly_recaps', filter: `link_id=eq.${linkId}` },
          (payload) => {
            const newRecap = payload.new as WeeklyRecap
            setRecap(prev => {
              if (!prev || newRecap.week_start > prev.week_start) {
                setShowBanner(true)
                return newRecap
              }
              return prev
            })
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
  }, [linkId])

  // Auto-dismiss banner
  useEffect(() => {
    if (!showBanner) return
    const timer = setTimeout(() => setShowBanner(false), 8000)
    return () => clearTimeout(timer)
  }, [showBanner])

  // Fetch past recaps on drawer open
  useEffect(() => {
    if (!open || loadedPast) return

    async function fetchPast() {
      try {
        const res = await fetch(`/api/recap?linkId=${linkId}&all=true`)
        const data = await res.json()
        if (data.recaps) {
          setPastRecaps(data.recaps)
        }
      } catch {
        toast('Failed to load recaps', 'error')
      } finally {
        setLoadedPast(true)
      }
    }

    fetchPast()
  }, [open, loadedPast, linkId])

  // Determine if it's Sunday or Monday (show sparkle badge)
  const dayOfWeek = new Date().getDay()
  const showSparkle = dayOfWeek === 0 || dayOfWeek === 1

  return (
    <>
      {/* Floating notification banner with shimmer */}
      <AnimatePresence>
        {showBanner && (
          <motion.button
            type="button"
            onClick={() => { setShowBanner(false); setOpen(true) }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full recap-banner-shimmer border border-neon-violet/40 backdrop-blur-md shadow-lg shadow-neon-violet/10"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            <span className="text-xs text-foreground/70 font-medium">
              Your weekly recap is ready!
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating trigger button -- sparkle animation on Sun/Mon */}
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed bottom-36 left-4 z-30 flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface-light/60 backdrop-blur-md border border-border/40 hover:border-neon-violet/40 transition-colors shadow-lg ${
          showSparkle ? 'recap-trigger-sparkle' : ''
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-sm">&#10024;</span>
        {/* Ternary conditional render */}
        {showSparkle && recap ? (
          <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
        ) : null}
      </motion.button>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />

            <motion.div
              className="fixed z-50 bottom-0 left-0 right-0 max-h-[80vh] flex flex-col bg-surface border-t border-border/50 rounded-t-3xl overflow-hidden"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-foreground/15" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-3 shrink-0">
                <div>
                  <h2 className="text-base font-bold bg-gradient-to-r from-neon-magenta to-neon-cyan bg-clip-text text-transparent">
                    Weekly Recap
                  </h2>
                  <p className="text-[10px] text-foreground/30 mt-0.5">
                    Your week together
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-foreground/30 hover:text-foreground/60 hover:bg-surface-light/40 transition-colors"
                >
                  &#10005;
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto min-h-0 px-5 pb-5 space-y-3">
                {!recap && !loadedPast ? (
                  <div className="space-y-3 py-2">
                    <div className="rounded-2xl border border-border/15 bg-surface-light/10 p-4 animate-pulse">
                      <div className="h-2.5 bg-surface-light/20 rounded w-16 mb-2" />
                      <div className="h-3.5 bg-surface-light/30 rounded w-40 mb-4" />
                      <div className="grid grid-cols-2 gap-2">
                        {[0, 1, 2, 3, 4, 5].map(i => (
                          <div key={i} className="h-8 bg-surface-light/15 rounded-lg" />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : !recap && loadedPast && pastRecaps.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <div className="text-2xl mb-2">&#10024;</div>
                    <p className="text-xs text-foreground/25">No recaps yet</p>
                    <p className="text-[10px] text-foreground/15 mt-1">
                      Your first recap will appear after a full week of activity
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Latest recap */}
                    {recap && (
                      <div>
                        <p className="text-[10px] text-foreground/25 mb-1.5">Latest</p>
                        <RecapCard recap={recap} isLatest />
                      </div>
                    )}

                    {/* Past recaps */}
                    {loadedPast && pastRecaps.length > 1 && (
                      <div>
                        <p className="text-[10px] text-foreground/25 mb-1.5">Previous weeks</p>
                        <div className="space-y-2">
                          {pastRecaps.slice(1).map((r, i) => (
                            <motion.div
                              key={r.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 + i * 0.08 }}
                            >
                              <RecapCard recap={r} />
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
