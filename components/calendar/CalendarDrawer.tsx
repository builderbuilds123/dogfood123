'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui/Toast'
import type { CalendarEvent, CalendarEventType } from '@/lib/types'

const EVENT_EMOJIS = ['💕', '🎉', '✈️', '🍕', '🎁', '⭐', '🏖️', '💍', '🎂', '❤️', '🌹', '🥂']

interface CalendarDrawerProps {
  linkId: string
  userId: string
  partnerName: string
  initialNextEvent: CalendarEvent | null
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function daysAgo(dateStr: string): string {
  const target = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 30) return `${diff}d ago`
  if (diff < 365) return `${Math.floor(diff / 30)}mo ago`
  const years = Math.floor(diff / 365)
  return `${years}y ago`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Compute todayStr once outside the component -- stable for the lifetime of the module
// (recalculates on page refresh which is sufficient for a date string)
function getTodayStr(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

export function CalendarDrawer({ linkId, userId, partnerName, initialNextEvent }: CalendarDrawerProps) {
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loaded, setLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'milestones'>('upcoming')
  const [nextEvent, setNextEvent] = useState<CalendarEvent | null>(initialNextEvent)

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newType, setNewType] = useState<CalendarEventType>('date')
  const [newEmoji, setNewEmoji] = useState('💕')
  const [newRecurring, setNewRecurring] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Ref to guard against double-submits without adding submitting to the dep array
  const submittingRef = useRef(false)

  // Realtime subscription
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
        .channel(`calendar:${linkId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'calendar_events', filter: `link_id=eq.${linkId}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newEvent = payload.new as CalendarEvent
              setEvents(prev => {
                if (prev.some(e => e.id === newEvent.id)) return prev
                const updated = [...prev, newEvent].sort((a, b) => a.event_date.localeCompare(b.event_date))
                return updated
              })
              // Update next event if this one is closer
              const days = daysUntil(newEvent.event_date)
              if (days >= 0) {
                setNextEvent(prev => {
                  if (!prev) return newEvent
                  return daysUntil(newEvent.event_date) < daysUntil(prev.event_date) ? newEvent : prev
                })
              }
            } else if (payload.eventType === 'UPDATE') {
              const updated = payload.new as CalendarEvent
              setEvents(prev => prev.map(e => (e.id === updated.id ? updated : e)))
            } else if (payload.eventType === 'DELETE') {
              const deleted = payload.old as { id: string }
              setEvents(prev => prev.filter(e => e.id !== deleted.id))
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
  }, [linkId])

  // Fetch events when drawer opens
  useEffect(() => {
    if (!open || loaded) return

    async function fetchEvents() {
      try {
        const res = await fetch(`/api/calendar?linkId=${linkId}`)
        const data = await res.json()
        if (data.events) {
          setEvents(data.events)
        }
      } catch {
        toast('Failed to load events', 'error')
      } finally {
        setLoaded(true)
      }
    }

    fetchEvents()
  }, [open, loaded, linkId])

  // Stable todayStr -- recomputed only when events change (which is the only time the
  // derived lists need to update). Practically this is stable within a session.
  const todayStr = useMemo(() => getTodayStr(), [events]) // eslint-disable-line react-hooks/exhaustive-deps

  // Derived state: memoised so we don't re-filter on every render
  const upcomingEvents = useMemo(
    () => events.filter(e => e.event_date >= todayStr),
    [events, todayStr],
  )

  const milestoneEvents = useMemo(
    () => events.filter(e => e.event_date < todayStr).reverse(),
    [events, todayStr],
  )

  // handleAdd uses refs for the submitting guard and reads form state via functional
  // setState so the callback itself only closes over stable props (linkId, userId).
  const handleAdd = useCallback(async () => {
    if (submittingRef.current) return
    // Snapshot current form values synchronously before any async work
    let title = ''
    let date = ''
    let type: CalendarEventType = 'date'
    let emoji = '💕'
    let recurring = false

    // Use a flag via setState updater to read + validate current values atomically
    // We'll store into local vars then proceed.
    // This pattern avoids closing over stale state.
    setNewTitle(prev => { title = prev; return prev })
    setNewDate(prev => { date = prev; return prev })
    setNewType(prev => { type = prev; return prev })
    setNewEmoji(prev => { emoji = prev; return prev })
    setNewRecurring(prev => { recurring = prev; return prev })

    // Need a microtask to let the synchronous setState updaters run
    await Promise.resolve()

    if (!title.trim() || !date) return

    submittingRef.current = true
    setSubmitting(true)

    const tempId = `temp-${Date.now()}`
    const optimisticEvent: CalendarEvent = {
      id: tempId,
      link_id: linkId,
      user_id: userId,
      title: title.trim(),
      description: null,
      event_date: date,
      event_type: type,
      emoji,
      recurring_yearly: recurring,
      created_at: new Date().toISOString(),
    }

    setEvents(prev => [...prev, optimisticEvent].sort((a, b) => a.event_date.localeCompare(b.event_date)))
    setNewTitle('')
    setNewDate('')
    setNewType('date')
    setNewEmoji('💕')
    setNewRecurring(false)
    setShowAddForm(false)

    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkId,
          title: optimisticEvent.title,
          eventDate: date,
          eventType: type,
          emoji,
          recurringYearly: recurring,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEvents(prev => prev.filter(e => e.id !== tempId))
        throw new Error(data.error)
      }
      const realEvent = data.event as CalendarEvent
      setEvents(prev => prev.map(e => e.id === tempId ? realEvent : e))

      // Update next event
      const days = daysUntil(realEvent.event_date)
      if (days >= 0) {
        setNextEvent(prev => {
          if (!prev) return realEvent
          return daysUntil(realEvent.event_date) < daysUntil(prev.event_date) ? realEvent : prev
        })
      }
    } catch (err) {
      setEvents(prev => prev.filter(e => e.id !== tempId))
      toast(err instanceof Error ? err.message : 'Failed to add event', 'error')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }, [linkId, userId])

  const handleDelete = useCallback(async (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id))
    try {
      await fetch('/api/calendar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch {
      toast('Failed to delete', 'error')
    }
  }, [])

  const countdownBadge = nextEvent ? daysUntil(nextEvent.event_date) : null

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-36 right-4 z-30 flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface-light/60 backdrop-blur-md border border-border/40 hover:border-neon-violet/40 transition-colors shadow-lg"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-sm">📅</span>
        {countdownBadge !== null && countdownBadge >= 0 && countdownBadge <= 30 ? (
          <span className={`text-[10px] font-bold text-neon-cyan tabular-nums${countdownBadge === 0 ? ' animate-pulse' : ''}`}>
            {countdownBadge === 0 ? 'today!' : `${countdownBadge}d`}
          </span>
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
                    Our Calendar
                  </h2>
                  <p className="text-[10px] text-foreground/30 mt-0.5">
                    {events.length} event{events.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-foreground/30 hover:text-foreground/60 hover:bg-surface-light/40 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Tab pills */}
              <div className="flex gap-1.5 px-5 pb-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('upcoming')}
                  className={`relative px-3 py-1 rounded-full text-[10px] font-medium transition-colors ${
                    activeTab === 'upcoming'
                      ? 'bg-neon-violet/20 text-neon-cyan border border-neon-violet/30'
                      : 'bg-surface-light/30 text-foreground/35 border border-border/20'
                  }`}
                >
                  Upcoming ({upcomingEvents.length})
                  {activeTab === 'upcoming' ? (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3/5 h-[2px] rounded-full bg-gradient-to-r from-neon-magenta to-neon-cyan" />
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('milestones')}
                  className={`relative px-3 py-1 rounded-full text-[10px] font-medium transition-colors ${
                    activeTab === 'milestones'
                      ? 'bg-neon-violet/20 text-neon-cyan border border-neon-violet/30'
                      : 'bg-surface-light/30 text-foreground/35 border border-border/20'
                  }`}
                >
                  Milestones ({milestoneEvents.length})
                  {activeTab === 'milestones' ? (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3/5 h-[2px] rounded-full bg-gradient-to-r from-neon-magenta to-neon-cyan" />
                  ) : null}
                </button>
              </div>

              {/* Event list */}
              <div className="flex-1 overflow-y-auto min-h-0 px-5 pb-2 space-y-1.5">
                {!loaded ? (
                  <div className="space-y-1.5 py-2">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-light/20 border border-border/15 animate-pulse">
                        <div className="w-6 h-6 rounded bg-surface-light/30 shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 bg-surface-light/30 rounded w-3/4" />
                          <div className="h-2 bg-surface-light/20 rounded w-1/2" />
                        </div>
                        <div className="w-8 h-4 bg-surface-light/20 rounded shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {activeTab === 'upcoming' ? (
                      <AnimatePresence mode="popLayout">
                        {upcomingEvents.length === 0 ? (
                          <div className="flex flex-col items-center py-10 text-center">
                            <div className="text-2xl mb-2">📅</div>
                            <p className="text-xs text-foreground/25">No upcoming events</p>
                            <p className="text-[10px] text-foreground/15 mt-1">Plan a date night!</p>
                          </div>
                        ) : (
                          upcomingEvents.map((event, i) => {
                            const days = daysUntil(event.event_date)
                            const isOwn = event.user_id === userId
                            const isNearest = i === 0
                            const isToday = days === 0

                            return (
                              <motion.div
                                key={event.id}
                                layout
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -40 }}
                                transition={{ delay: i * 0.04 }}
                                className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-colors ${
                                  isNearest
                                    ? 'bg-neon-violet/10 border-neon-violet/30'
                                    : 'bg-surface-light/30 border-border/25'
                                }`}
                              >
                                <span className="text-lg shrink-0">{event.emoji}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-foreground/75 truncate">{event.title}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[9px] text-foreground/30">{formatDate(event.event_date)}</span>
                                    <span className="text-[9px] text-foreground/20">
                                      {isOwn ? 'You' : partnerName}
                                    </span>
                                  </div>
                                </div>
                                <div className="shrink-0 text-right">
                                  <span className={`text-xs font-bold tabular-nums ${isNearest ? 'text-neon-cyan' : 'text-foreground/40'}${isToday ? ' animate-pulse' : ''}`}>
                                    {isToday ? 'Today!' : `${days}d`}
                                  </span>
                                </div>
                                {isOwn ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(event.id)}
                                    className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-foreground/15 hover:text-red-400/50 transition-colors"
                                  >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                ) : null}
                              </motion.div>
                            )
                          })
                        )}
                      </AnimatePresence>
                    ) : null}

                    {activeTab === 'milestones' ? (
                      <AnimatePresence mode="popLayout">
                        {milestoneEvents.length === 0 ? (
                          <div className="flex flex-col items-center py-10 text-center">
                            <div className="text-2xl mb-2">💕</div>
                            <p className="text-xs text-foreground/25">No milestones yet</p>
                            <p className="text-[10px] text-foreground/15 mt-1">Add your first date, anniversary, etc.</p>
                          </div>
                        ) : (
                          milestoneEvents.map((event, i) => {
                            const isOwn = event.user_id === userId

                            return (
                              <motion.div
                                key={event.id}
                                layout
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -40 }}
                                transition={{ delay: i * 0.04 }}
                                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-light/30 border border-border/25"
                              >
                                <span className="text-lg shrink-0">{event.emoji}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-foreground/75 truncate">{event.title}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[9px] text-foreground/30">{formatDate(event.event_date)}</span>
                                    <span className="text-[9px] text-foreground/20">
                                      {isOwn ? 'You' : partnerName}
                                    </span>
                                    {event.recurring_yearly ? (
                                      <span className="text-[9px] text-neon-violet/40">🔁 yearly</span>
                                    ) : null}
                                  </div>
                                </div>
                                <span className="shrink-0 text-[10px] text-foreground/25">
                                  {daysAgo(event.event_date)}
                                </span>
                                {isOwn ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(event.id)}
                                    className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-foreground/15 hover:text-red-400/50 transition-colors"
                                  >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                ) : null}
                              </motion.div>
                            )
                          })
                        )}
                      </AnimatePresence>
                    ) : null}
                  </>
                )}
              </div>

              {/* Add event bar */}
              <div className="shrink-0 px-5 pb-5 pt-2 border-t border-border/20">
                <AnimatePresence>
                  {showAddForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mb-2 space-y-2"
                    >
                      {/* Type toggle */}
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setNewType('date')}
                          className={`px-2.5 py-1 rounded-md text-[10px] transition-colors ${
                            newType === 'date'
                              ? 'bg-neon-violet/20 text-neon-cyan border border-neon-violet/30'
                              : 'bg-surface-light/30 text-foreground/25 border border-border/15'
                          }`}
                        >
                          📅 Planned Date
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewType('milestone')}
                          className={`px-2.5 py-1 rounded-md text-[10px] transition-colors ${
                            newType === 'milestone'
                              ? 'bg-neon-violet/20 text-neon-cyan border border-neon-violet/30'
                              : 'bg-surface-light/30 text-foreground/25 border border-border/15'
                          }`}
                        >
                          💕 Milestone
                        </button>
                        {newType === 'milestone' ? (
                          <button
                            type="button"
                            onClick={() => setNewRecurring(prev => !prev)}
                            className={`px-2.5 py-1 rounded-md text-[10px] transition-colors ${
                              newRecurring
                                ? 'bg-neon-violet/20 text-neon-cyan border border-neon-violet/30'
                                : 'bg-surface-light/30 text-foreground/25 border border-border/15'
                            }`}
                          >
                            🔁 Yearly
                          </button>
                        ) : null}
                      </div>

                      {/* Emoji picker */}
                      <div className="flex gap-1 flex-wrap">
                        {EVENT_EMOJIS.map(e => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => setNewEmoji(e)}
                            className={`w-7 h-7 rounded-md flex items-center justify-center text-sm transition-all ${
                              newEmoji === e
                                ? 'bg-neon-violet/20 border border-neon-violet/30 shadow-[0_0_8px_rgba(139,92,246,0.35)] scale-110'
                                : 'bg-surface-light/20 border border-border/10 hover:bg-surface-light/40'
                            }`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>

                      {/* Date picker */}
                      <input
                        type="date"
                        value={newDate}
                        onChange={e => setNewDate(e.target.value)}
                        className="w-full bg-surface-light/40 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-neon-violet/30 [color-scheme:dark]"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(prev => !prev)}
                    className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border transition-colors text-sm ${
                      showAddForm
                        ? 'bg-neon-violet/15 border-neon-violet/30 text-neon-cyan'
                        : 'bg-surface-light/30 border-border/20 text-foreground/30 hover:text-foreground/50'
                    }`}
                  >
                    {newEmoji}
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="Add an event..."
                    maxLength={200}
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                    className="flex-1 bg-surface-light/40 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-foreground/25 focus:outline-none focus:ring-1 focus:ring-neon-violet/30"
                  />
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={!newTitle.trim() || !newDate || submitting}
                    className="shrink-0 w-8 h-8 rounded-lg bg-neon-violet/20 border border-neon-violet/30 flex items-center justify-center text-neon-violet hover:bg-neon-violet/30 transition-colors disabled:opacity-25"
                  >
                    {submitting ? (
                      <span className="text-[10px]">...</span>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
