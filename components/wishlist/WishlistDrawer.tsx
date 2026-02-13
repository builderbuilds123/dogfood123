'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui/Toast'
import type { WishlistItem, WishlistCategory } from '@/lib/types'

const CATEGORIES: { key: WishlistCategory; label: string; emoji: string }[] = [
  { key: 'dates', label: 'Dates', emoji: '💕' },
  { key: 'travel', label: 'Travel', emoji: '✈️' },
  { key: 'food', label: 'Food', emoji: '🍕' },
  { key: 'gifts', label: 'Gifts', emoji: '🎁' },
  { key: 'goals', label: 'Goals', emoji: '⭐' },
  { key: 'other', label: 'Other', emoji: '📝' },
]

interface WishlistDrawerProps {
  initialItems: WishlistItem[]
  linkId: string
  userId: string
  partnerName: string
}

export function WishlistDrawer({ initialItems, linkId, userId, partnerName }: WishlistDrawerProps) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<WishlistItem[]>(initialItems)
  const [activeCategory, setActiveCategory] = useState<WishlistCategory | 'all'>('all')
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState<WishlistCategory>('other')
  const [submitting, setSubmitting] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Real-time subscription — must setAuth for RLS-filtered channels
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
        .channel(`wishlist:${linkId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'wishlist_items', filter: `link_id=eq.${linkId}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newItem = payload.new as WishlistItem
              setItems(prev => prev.some(i => i.id === newItem.id) ? prev : [newItem, ...prev])
            } else if (payload.eventType === 'UPDATE') {
              const updated = payload.new as WishlistItem
              setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)))
            } else if (payload.eventType === 'DELETE') {
              const deleted = payload.old as { id: string }
              setItems(prev => prev.filter(i => i.id !== deleted.id))
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

  const filteredItems = activeCategory === 'all'
    ? items
    : items.filter(i => i.category === activeCategory)

  const completedCount = items.filter(i => i.completed).length
  const pendingCount = items.length - completedCount

  const handleAdd = useCallback(async () => {
    if (!newTitle.trim() || submitting) return
    setSubmitting(true)

    const trimmedTitle = newTitle.trim()
    const tempId = `temp-${Date.now()}`
    const optimisticItem: WishlistItem = {
      id: tempId,
      link_id: linkId,
      user_id: userId,
      title: trimmedTitle,
      category: newCategory,
      completed: false,
      completed_by: null,
      created_at: new Date().toISOString(),
      completed_at: null,
    }

    // Optimistic: show immediately
    setItems(prev => [optimisticItem, ...prev])
    setNewTitle('')
    setShowCategoryPicker(false)

    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId, title: trimmedTitle, category: newCategory }),
      })
      const data = await res.json()
      if (!res.ok) {
        // Remove optimistic item on error
        setItems(prev => prev.filter(i => i.id !== tempId))
        throw new Error(data.error)
      }
      // Replace temp item with real one from server
      const realItem = data.item as WishlistItem
      setItems(prev => prev.map(i => i.id === tempId ? realItem : i))
    } catch (err) {
      setItems(prev => prev.filter(i => i.id !== tempId))
      toast(err instanceof Error ? err.message : 'Failed to add item', 'error')
    } finally {
      setNewCategory('other')
      setSubmitting(false)
    }
  }, [linkId, userId, newTitle, newCategory, submitting])

  const handleToggle = useCallback(async (item: WishlistItem) => {
    setItems(prev => prev.map(i =>
      i.id === item.id
        ? { ...i, completed: !i.completed, completed_by: !i.completed ? userId : null, completed_at: !i.completed ? new Date().toISOString() : null }
        : i
    ))
    try {
      const res = await fetch('/api/wishlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, completed: !item.completed }),
      })
      if (!res.ok) setItems(prev => prev.map(i => (i.id === item.id ? item : i)))
    } catch {
      setItems(prev => prev.map(i => (i.id === item.id ? item : i)))
    }
  }, [userId])

  const handleDelete = useCallback(async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    try {
      await fetch('/api/wishlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch {
      toast('Failed to delete', 'error')
    }
  }, [])

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-30 flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface-light/60 backdrop-blur-md border border-border/40 hover:border-neon-violet/40 transition-colors shadow-lg"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-sm">📋</span>
        {pendingCount > 0 && (
          <span className="text-[10px] font-bold text-neon-cyan tabular-nums">{pendingCount}</span>
        )}
      </motion.button>

      {/* Drawer overlay */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />

            {/* Drawer panel */}
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
                    Shared Wishlist
                  </h2>
                  <p className="text-[10px] text-foreground/30 mt-0.5">
                    {completedCount}/{items.length} completed
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

              {/* Category pills */}
              <div className="flex gap-1.5 px-5 pb-3 overflow-x-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveCategory('all')}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                    activeCategory === 'all'
                      ? 'bg-neon-violet/20 text-neon-cyan border border-neon-violet/30'
                      : 'bg-surface-light/30 text-foreground/35 border border-border/20'
                  }`}
                >
                  All
                </button>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setActiveCategory(cat.key)}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                      activeCategory === cat.key
                        ? 'bg-neon-violet/20 text-neon-cyan border border-neon-violet/30'
                        : 'bg-surface-light/30 text-foreground/35 border border-border/20'
                    }`}
                  >
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>

              {/* Item list */}
              <div className="flex-1 overflow-y-auto min-h-0 px-5 pb-2 space-y-1.5">
                <AnimatePresence mode="popLayout">
                  {filteredItems.map(item => {
                    const cat = CATEGORIES.find(c => c.key === item.category)
                    const isOwn = item.user_id === userId

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-colors ${
                          item.completed
                            ? 'bg-surface-light/15 border-border/15'
                            : 'bg-surface-light/30 border-border/25'
                        }`}
                      >
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => handleToggle(item)}
                          className={`shrink-0 w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center transition-colors ${
                            item.completed
                              ? 'bg-neon-violet/60 border-neon-violet/80'
                              : 'border-foreground/20 hover:border-neon-violet/40'
                          }`}
                          style={{ width: 18, height: 18 }}
                        >
                          {item.completed && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs leading-snug ${item.completed ? 'text-foreground/25 line-through' : 'text-foreground/75'}`}>
                            {item.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] text-foreground/20">{cat?.emoji}</span>
                            <span className="text-[9px] text-foreground/20">
                              {isOwn ? 'You' : partnerName}
                            </span>
                            {item.completed && item.completed_by && (
                              <span className="text-[9px] text-neon-violet/40">
                                ✓ {item.completed_by === userId ? 'You' : partnerName}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Delete */}
                        {isOwn && (
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-foreground/15 hover:text-red-400/50 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>

                {filteredItems.length === 0 && (
                  <div className="flex flex-col items-center py-10 text-center">
                    <div className="text-2xl mb-2">
                      {activeCategory === 'all' ? '📋' : CATEGORIES.find(c => c.key === activeCategory)?.emoji}
                    </div>
                    <p className="text-xs text-foreground/25">
                      {activeCategory === 'all' ? 'Nothing here yet!' : `No ${activeCategory} items`}
                    </p>
                  </div>
                )}
              </div>

              {/* Inline add bar */}
              <div className="shrink-0 px-5 pb-5 pt-2 border-t border-border/20">
                <AnimatePresence>
                  {showCategoryPicker && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex gap-1.5 flex-wrap mb-2 overflow-hidden"
                    >
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => { setNewCategory(cat.key); setShowCategoryPicker(false) }}
                          className={`px-2 py-0.5 rounded-md text-[10px] transition-colors ${
                            newCategory === cat.key
                              ? 'bg-neon-violet/20 text-neon-cyan border border-neon-violet/30'
                              : 'bg-surface-light/30 text-foreground/25 border border-border/15'
                          }`}
                        >
                          {cat.emoji} {cat.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCategoryPicker(prev => !prev)}
                    className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border transition-colors text-sm ${
                      showCategoryPicker
                        ? 'bg-neon-violet/15 border-neon-violet/30 text-neon-cyan'
                        : 'bg-surface-light/30 border-border/20 text-foreground/30 hover:text-foreground/50'
                    }`}
                    title="Pick category"
                  >
                    {CATEGORIES.find(c => c.key === newCategory)?.emoji || '📝'}
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="Add a wish..."
                    maxLength={200}
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                    className="flex-1 bg-surface-light/40 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-foreground/25 focus:outline-none focus:ring-1 focus:ring-neon-violet/30"
                  />
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={!newTitle.trim() || submitting}
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
