'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { MoodEmoji } from './MoodEmoji'

const MOODS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '🥰', label: 'Loved' },
  { emoji: '😤', label: 'Frustrated' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '🤗', label: 'Grateful' },
  { emoji: '😰', label: 'Anxious' },
  { emoji: '🤒', label: 'Sick' },
  { emoji: '🔥', label: 'Excited' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '😐', label: 'Meh' },
  { emoji: '🫠', label: 'Overwhelmed' },
] as const

interface MoodPickerProps {
  open: boolean
  onClose: () => void
  onSubmit: (emoji: string, note: string | null) => void
  submitting: boolean
}

export function MoodPicker({ open, onClose, onSubmit, submitting }: MoodPickerProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null)
  const [note, setNote] = useState('')

  function handleSubmit() {
    if (!selectedEmoji) return
    onSubmit(selectedEmoji, note.trim() || null)
    setSelectedEmoji(null)
    setNote('')
  }

  function handleClose() {
    setSelectedEmoji(null)
    setNote('')
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Bottom sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border rounded-t-2xl px-4 pb-8 pt-4 max-w-lg mx-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 rounded-full bg-foreground/20 mx-auto mb-4" />

            <h3 className="text-sm font-medium text-foreground/70 mb-3 text-center">
              How are you feeling?
            </h3>

            {/* Emoji grid */}
            <div className="grid grid-cols-4 gap-1 mb-4">
              {MOODS.map(({ emoji, label }) => (
                <MoodEmoji
                  key={emoji}
                  emoji={emoji}
                  label={label}
                  selected={selectedEmoji === emoji}
                  onSelect={() => setSelectedEmoji(emoji)}
                />
              ))}
            </div>

            {/* Note input — only shows after selecting an emoji */}
            {selectedEmoji && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-4"
              >
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  maxLength={100}
                  placeholder="add a note..."
                  className="w-full bg-surface-light/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-neon-violet/40"
                />
              </motion.div>
            )}

            {/* Submit button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedEmoji || submitting}
              className="w-full py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-neon-violet/20 text-neon-violet border border-neon-violet/30 hover:bg-neon-violet/30 active:scale-[0.98]"
            >
              {submitting ? 'Sending...' : 'Send check-in'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
