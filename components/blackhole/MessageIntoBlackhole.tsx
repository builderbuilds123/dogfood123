'use client'

import { motion } from 'motion/react'

interface MessageIntoBlackholeProps {
  children: React.ReactNode
  onComplete: () => void
  startPosition?: { x: number; y: number }
}

export function MessageIntoBlackhole({ children, onComplete, startPosition = { x: 0, y: 200 } }: MessageIntoBlackholeProps) {
  return (
    <motion.div
      className="absolute z-10 pointer-events-none"
      style={{ left: '50%', top: '50%' }}
      initial={{
        x: startPosition.x,
        y: startPosition.y,
        scale: 1,
        opacity: 1,
        rotate: 0,
      }}
      animate={{
        x: 0,
        y: 0,
        scale: 0,
        opacity: 0,
        rotate: 720,
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
