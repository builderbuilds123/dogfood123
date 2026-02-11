'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { MoodPicker } from './MoodPicker'
import type { MoodCheckin } from '@/lib/types'

interface MoodOrbProps {
  linkId: string
  userId: string
  myMood: MoodCheckin | null
  partnerMood: MoodCheckin | null
  onMoodSubmitted: (checkin: MoodCheckin) => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function MoodOrb({ linkId, userId, myMood, partnerMood, onMoodSubmitted }: MoodOrbProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [popKey, setPopKey] = useState(0) // triggers pop animation

  const handleSubmit = useCallback(async (emoji: string, note: string | null) => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/mood/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId, emoji, note }),
      })
      const data = await res.json()
      if (data.checkin) {
        onMoodSubmitted(data.checkin)
        setPickerOpen(false)
      }
    } finally {
      setSubmitting(false)
    }
  }, [linkId, onMoodSubmitted])

  // Trigger pop when partner mood changes
  const handlePartnerPop = useCallback(() => {
    setPopKey(prev => prev + 1)
  }, [])

  const hasAnyMood = myMood || partnerMood

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.button
          key={`orb-${popKey}`}
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-light/40 border border-border/30 backdrop-blur-sm hover:bg-surface-light/60 transition-colors"
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
          {hasAnyMood ? (
            <>
              {partnerMood && (
                <span className="text-base leading-none">{partnerMood.emoji}</span>
              )}
              {partnerMood && myMood && (
                <span className="text-foreground/20 text-[10px]">·</span>
              )}
              {myMood && (
                <span className="text-sm leading-none opacity-60">{myMood.emoji}</span>
              )}
              {partnerMood && (
                <span className="text-[10px] text-foreground/30 leading-none">
                  {timeAgo(partnerMood.created_at)}
                </span>
              )}
            </>
          ) : (
            <>
              <motion.span
                className="text-base leading-none"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                💭
              </motion.span>
              <span className="text-[10px] text-foreground/40 leading-none">check in?</span>
            </>
          )}
        </motion.button>
      </AnimatePresence>

      <MoodPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </>
  )
}

// Export for external pop trigger
export { type MoodOrbProps }
