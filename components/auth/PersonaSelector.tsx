'use client'

import { motion } from 'motion/react'
import type { Persona } from '@/lib/types'

interface PersonaSelectorProps {
  selected: Persona | null
  onSelect: (persona: Persona) => void
  locked?: Persona | null
}

const personas = [
  {
    id: 'doggo' as Persona,
    emoji: '🐕',
    name: 'The Doggo',
    description: 'Loyal, warm, and full of energy',
    colors: 'from-amber-500/20 to-orange-600/20 border-amber-500/40 hover:border-amber-400',
    glow: 'shadow-[0_0_30px_rgba(245,158,11,0.3)]',
    selectedBg: 'from-amber-500/30 to-orange-600/30',
  },
  {
    id: 'princess' as Persona,
    emoji: '👸',
    name: 'The Princess',
    description: 'Regal, graceful, and enchanting',
    colors: 'from-purple-500/20 to-pink-500/20 border-purple-500/40 hover:border-purple-400',
    glow: 'shadow-[0_0_30px_rgba(168,85,247,0.3)]',
    selectedBg: 'from-purple-500/30 to-pink-500/30',
  },
]

export function PersonaSelector({ selected, onSelect, locked }: PersonaSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4 w-full">
      {personas.map(p => {
        const isSelected = selected === p.id
        const isLocked = locked !== null && locked !== p.id
        const isLockedSelected = locked === p.id

        return (
          <motion.button
            key={p.id}
            type="button"
            onClick={() => !isLocked && onSelect(p.id)}
            whileHover={!isLocked ? { scale: 1.03 } : {}}
            whileTap={!isLocked ? { scale: 0.98 } : {}}
            className={`relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300 bg-gradient-to-br ${
              isSelected || isLockedSelected
                ? `${p.selectedBg} ${p.colors.split(' ')[2]} ${p.glow}`
                : isLocked
                  ? 'opacity-30 cursor-not-allowed border-border bg-surface/30'
                  : `${p.colors} bg-surface/50 cursor-pointer`
            }`}
            disabled={isLocked}
          >
            <span className="text-5xl">{p.emoji}</span>
            <span className="font-semibold text-lg">{p.name}</span>
            <span className="text-foreground/50 text-sm">{p.description}</span>
            {(isSelected || isLockedSelected) && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-3 right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs"
              >
                ✓
              </motion.div>
            )}
            {isLockedSelected && (
              <span className="text-xs text-foreground/40 mt-1">Auto-assigned via referral</span>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
