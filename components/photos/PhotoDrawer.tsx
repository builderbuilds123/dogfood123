'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/lib/types'

interface PhotoDrawerProps {
  initialPhotos: Message[]
  linkId: string
  userId: string
  partnerName: string
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function PhotoDrawer({ initialPhotos, linkId, userId, partnerName }: PhotoDrawerProps) {
  const [open, setOpen] = useState(false)
  const [photos, setPhotos] = useState<Message[]>(initialPhotos)
  const [selectedPhoto, setSelectedPhoto] = useState<Message | null>(null)

  // Listen for new image messages via Realtime
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
        .channel(`photos:${linkId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `link_id=eq.${linkId}` },
          (payload) => {
            const msg = payload.new as Message
            if (msg.message_type === 'image') {
              setPhotos(prev => prev.some(p => p.id === msg.id) ? prev : [msg, ...prev])
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

  const photoCount = photos.length

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 left-4 z-30 flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface-light/60 backdrop-blur-md border border-border/40 hover:border-neon-violet/40 transition-colors shadow-lg"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-sm">📷</span>
        {photoCount > 0 && (
          <span className="text-[10px] font-bold text-neon-cyan tabular-nums">{photoCount}</span>
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
              className="fixed z-50 bottom-0 left-0 right-0 max-h-[85vh] flex flex-col bg-surface border-t border-border/50 rounded-t-3xl overflow-hidden"
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
                    Photo Drops
                  </h2>
                  <p className="text-[10px] text-foreground/30 mt-0.5">
                    {photoCount} photo{photoCount !== 1 ? 's' : ''}
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

              {/* Photo grid */}
              <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-6">
                {photos.length === 0 ? (
                  <div className="flex flex-col items-center py-16 text-center">
                    <div className="text-3xl mb-3">📷</div>
                    <p className="text-sm text-foreground/30">No photos yet</p>
                    <p className="text-xs text-foreground/20 mt-1">
                      Send images through the blackhole and they&apos;ll appear here.
                    </p>
                  </div>
                ) : (
                  <div className="columns-2 gap-2.5 space-y-2.5">
                    {photos.map((photo, i) => (
                      <motion.button
                        key={photo.id}
                        type="button"
                        onClick={() => setSelectedPhoto(photo)}
                        className="block w-full break-inside-avoid rounded-xl overflow-hidden border border-border/25 hover:border-neon-violet/40 transition-colors group relative"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.04, 0.4) }}
                      >
                        <img
                          src={photo.media_url || ''}
                          alt={photo.content || 'Photo'}
                          className="w-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-2">
                            <p className="text-[10px] text-white/70">
                              {photo.sender_id === userId ? 'You' : partnerName} · {formatDate(photo.created_at)}
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Lightbox — renders above everything */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              className="relative max-w-[90vw] max-h-[85vh]"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              <img
                src={selectedPhoto.media_url || ''}
                alt={selectedPhoto.content || 'Photo'}
                className="max-w-full max-h-[85vh] object-contain rounded-xl"
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-xl">
                <p className="text-sm text-white/80">
                  {selectedPhoto.sender_id === userId ? 'You' : partnerName}
                </p>
                <p className="text-xs text-white/50">
                  {formatDate(selectedPhoto.created_at)}
                </p>
                {selectedPhoto.content && (
                  <p className="text-xs text-white/60 mt-1">{selectedPhoto.content}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
              >
                ✕
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
