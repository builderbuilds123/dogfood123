'use client'

import { useState, useCallback, useEffect } from 'react'
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

interface WishlistViewProps {
  items: WishlistItem[]
  linkId: string
  userId: string
  partnerName: string
}

export function WishlistView({ items: initialItems, linkId, userId, partnerName }: WishlistViewProps) {
  const [items, setItems] = useState<WishlistItem[]>(initialItems)
  const [activeCategory, setActiveCategory] = useState<WishlistCategory | 'all'>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState<WishlistCategory>('other')
  const [submitting, setSubmitting] = useState(false)

  // Real-time subscription for wishlist changes
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`wishlist:${linkId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wishlist_items',
          filter: `link_id=eq.${linkId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as WishlistItem
            setItems(prev => {
              if (prev.some(i => i.id === newItem.id)) return prev
              return [newItem, ...prev]
            })
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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [linkId])

  const filteredItems = activeCategory === 'all'
    ? items
    : items.filter(i => i.category === activeCategory)

  const completedCount = items.filter(i => i.completed).length

  const handleAdd = useCallback(async () => {
    if (!newTitle.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId, title: newTitle, category: newCategory }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Realtime will add the item to state
      setNewTitle('')
      setShowAddForm(false)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to add item', 'error')
    } finally {
      setSubmitting(false)
    }
  }, [linkId, newTitle, newCategory, submitting])

  const handleToggle = useCallback(async (item: WishlistItem) => {
    // Optimistic update
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
      if (!res.ok) {
        // Revert on error
        setItems(prev => prev.map(i => (i.id === item.id ? item : i)))
      }
    } catch {
      setItems(prev => prev.map(i => (i.id === item.id ? item : i)))
    }
  }, [userId])

  const handleDelete = useCallback(async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    try {
      const res = await fetch('/api/wishlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        // Refetch on error
        toast('Failed to delete', 'error')
      }
    } catch {
      toast('Failed to delete', 'error')
    }
  }, [])

  return (
    <div className="max-w-lg mx-auto px-4 py-6 h-[calc(100vh-56px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-neon-magenta to-neon-cyan bg-clip-text text-transparent">
            Shared Wishlist
          </h1>
          <p className="text-xs text-foreground/30 mt-0.5">
            {completedCount}/{items.length} completed
          </p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 shrink-0 scrollbar-hide">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            activeCategory === 'all'
              ? 'bg-neon-violet/20 text-neon-cyan border border-neon-violet/30'
              : 'bg-surface-light/40 text-foreground/40 border border-border/30 hover:text-foreground/60'
          }`}
        >
          All ({items.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = items.filter(i => i.category === cat.key).length
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat.key
                  ? 'bg-neon-violet/20 text-neon-cyan border border-neon-violet/30'
                  : 'bg-surface-light/40 text-foreground/40 border border-border/30 hover:text-foreground/60'
              }`}
            >
              {cat.emoji} {cat.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredItems.map(item => {
            const cat = CATEGORIES.find(c => c.key === item.category)
            const isOwn = item.user_id === userId

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                  item.completed
                    ? 'bg-surface-light/20 border-border/20'
                    : 'bg-surface-light/40 border-border/30'
                }`}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => handleToggle(item)}
                  className={`shrink-0 mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    item.completed
                      ? 'bg-neon-violet/60 border-neon-violet/80'
                      : 'border-foreground/20 hover:border-neon-violet/40'
                  }`}
                >
                  {item.completed && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${item.completed ? 'text-foreground/30 line-through' : 'text-foreground/80'}`}>
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-foreground/25">
                      {cat?.emoji} {cat?.label}
                    </span>
                    <span className="text-[10px] text-foreground/20">·</span>
                    <span className="text-[10px] text-foreground/20">
                      {isOwn ? 'You' : partnerName}
                    </span>
                    {item.completed && item.completed_by && (
                      <>
                        <span className="text-[10px] text-foreground/20">·</span>
                        <span className="text-[10px] text-neon-violet/50">
                          ✓ {item.completed_by === userId ? 'You' : partnerName}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Delete — only own items */}
                {isOwn && (
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-foreground/20 hover:text-red-400/60 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-3xl mb-3">
              {activeCategory === 'all' ? '📋' : CATEGORIES.find(c => c.key === activeCategory)?.emoji}
            </div>
            <p className="text-sm text-foreground/30">
              {activeCategory === 'all' ? 'No items yet' : `No ${activeCategory} items`}
            </p>
            <p className="text-xs text-foreground/20 mt-1">Tap + to add one!</p>
          </div>
        )}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="shrink-0 mt-3 p-3 bg-surface border border-border/40 rounded-2xl"
          >
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="What do you want to do together?"
              maxLength={200}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              className="w-full bg-surface-light/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-neon-violet/40 mb-2"
            />
            <div className="flex gap-1.5 flex-wrap mb-3">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setNewCategory(cat.key)}
                  className={`px-2 py-1 rounded-md text-[10px] transition-colors ${
                    newCategory === cat.key
                      ? 'bg-neon-violet/20 text-neon-cyan border border-neon-violet/30'
                      : 'bg-surface-light/30 text-foreground/30 border border-border/20'
                  }`}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setNewTitle('') }}
                className="flex-1 py-2 rounded-lg text-xs text-foreground/40 border border-border/30 hover:bg-surface-light/30 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!newTitle.trim() || submitting}
                className="flex-1 py-2 rounded-lg text-xs font-medium bg-neon-violet/20 text-neon-violet border border-neon-violet/30 hover:bg-neon-violet/30 transition-colors disabled:opacity-30"
              >
                {submitting ? 'Adding...' : 'Add'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating add button */}
      {!showAddForm && (
        <motion.button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-neon-violet/80 hover:bg-neon-violet flex items-center justify-center shadow-[0_0_20px_rgba(139,0,255,0.4)] hover:shadow-[0_0_30px_rgba(139,0,255,0.6)] transition-all z-30"
          whileTap={{ scale: 0.9 }}
        >
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </motion.button>
      )}
    </div>
  )
}
