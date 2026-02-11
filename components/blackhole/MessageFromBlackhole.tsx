'use client'

import { motion } from 'motion/react'

interface MessageFromBlackholeProps {
  children: React.ReactNode
  onComplete: () => void
  endPosition?: { x: number; y: number }
}

export function MessageFromBlackhole({ children, onComplete, endPosition = { x: 0, y: -200 } }: MessageFromBlackholeProps) {
  return (
    <motion.div
      className="absolute z-10 pointer-events-none"
      style={{ left: '50%', top: '50%' }}
      initial={{
        x: 0,
        y: 0,
        scale: 0,
        opacity: 0,
        rotate: -720,
      }}
      animate={{
        x: endPosition.x,
        y: endPosition.y,
        scale: 1,
        opacity: 1,
        rotate: 0,
      }}
      transition={{
        duration: 1.5,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      onAnimationComplete={onComplete}
    >
      {children}
    </motion.div>
  )
}
