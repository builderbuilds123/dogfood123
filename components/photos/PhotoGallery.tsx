'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { Message } from '@/lib/types'

interface PhotoGalleryProps {
  photos: Message[]
  userId: string
  partnerName: string
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function PhotoGallery({ photos, userId, partnerName }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Message | null>(null)

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] px-4">
        <div className="text-4xl mb-4">📷</div>
        <h2 className="text-lg font-medium text-foreground/70 mb-2">No photos yet</h2>
        <p className="text-sm text-foreground/40 text-center max-w-xs">
          Send images through the blackhole and they&apos;ll appear here in your shared gallery.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-neon-magenta to-neon-cyan bg-clip-text text-transparent">
          Photo Drops
        </h1>
        <p className="text-xs text-foreground/30">
          {photos.length} photo{photos.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Masonry-like grid */}
      <div className="columns-2 sm:columns-3 gap-3 space-y-3">
        {photos.map((photo, i) => (
          <motion.button
            key={photo.id}
            type="button"
            onClick={() => setSelectedPhoto(photo)}
            className="block w-full break-inside-avoid rounded-xl overflow-hidden border border-border/30 hover:border-neon-violet/40 transition-colors group relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.5) }}
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

      {/* Lightbox */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
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
    </div>
  )
}
