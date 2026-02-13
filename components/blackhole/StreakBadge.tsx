'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface StreakBadgeProps {
  linkId: string
}

type Tier = 'hidden' | 'dim' | 'glow' | 'neon'

function getTier(streak: number): Tier {
  if (streak <= 0) return 'hidden'
  if (streak <= 7) return 'dim'
  if (streak <= 30) return 'glow'
  return 'neon'
}

const tierStyles: Record<Tier, { text: string; shadow: string; bg: string }> = {
  hidden: { text: '', shadow: '', bg: '' },
  dim: {
    text: 'text-foreground/40',
    shadow: '',
    bg: 'bg-surface-light/30',
  },
  glow: {
    text: 'text-neon-violet/80',
    shadow: 'shadow-[0_0_12px_rgba(139,0,255,0.3)]',
    bg: 'bg-neon-violet/10',
  },
  neon: {
    text: 'text-neon-magenta',
    shadow: 'shadow-[0_0_20px_rgba(255,0,255,0.4),0_0_40px_rgba(139,0,255,0.2)]',
    bg: 'bg-neon-magenta/10',
  },
}

export function StreakBadge({ linkId }: StreakBadgeProps) {
  const [streak, setStreak] = useState<number>(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function fetchStreak() {
      try {
        const res = await fetch(`/api/streak?linkId=${linkId}`)
        const data = await res.json()
        if (typeof data.streak === 'number') {
          setStreak(data.streak)
        }
      } catch {
        // silent fail — streak is non-critical
      } finally {
        setLoaded(true)
      }
    }
    fetchStreak()
  }, [linkId])

  const tier = getTier(streak)

  if (!loaded || tier === 'hidden') return null

  const styles = tierStyles[tier]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`absolute z-20 pointer-events-none flex items-center justify-center`}
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
      >
        <div
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full border border-border/30 backdrop-blur-sm ${styles.bg} ${styles.shadow}`}
        >
          <span className="text-xs">🔥</span>
          <span className={`text-xs font-bold tabular-nums ${styles.text}`}>
            {streak}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
