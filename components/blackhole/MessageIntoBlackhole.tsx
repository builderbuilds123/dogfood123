'use client'

import { motion } from 'motion/react'

interface MessageIntoBlackholeProps {
  children: React.ReactNode
  onComplete: () => void
}

export function MessageIntoBlackhole({ children, onComplete }: MessageIntoBlackholeProps) {
  return (
    <motion.div
      className="absolute z-10 pointer-events-none"
      style={{ left: '50%', top: '50%', translateX: '-50%' }}
      initial={{
        y: 180,
        scale: 1,
        opacity: 1,
      }}
      animate={{
        y: 0,
        scale: 0,
        opacity: 0,
      }}
      transition={{
        duration: 1.2,
        ease: [0.4, 0, 0.2, 1],
      }}
      onAnimationComplete={onComplete}
    >
      {children}
    </motion.div>
  )
}
