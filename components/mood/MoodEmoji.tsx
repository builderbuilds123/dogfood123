'use client'

import { motion } from 'motion/react'

interface MoodEmojiProps {
  emoji: string
  label: string
  selected: boolean
  onSelect: () => void
}

export function MoodEmoji({ emoji, label, selected, onSelect }: MoodEmojiProps) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.9 }}
      className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
        selected
          ? 'bg-neon-violet/20 ring-2 ring-neon-violet/60'
          : 'hover:bg-surface-light/40'
      }`}
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-[10px] text-foreground/40 leading-tight">{label}</span>
    </motion.button>
  )
}
