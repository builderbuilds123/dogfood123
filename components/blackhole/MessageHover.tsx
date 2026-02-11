'use client'

import { motion } from 'motion/react'

interface MessageHoverProps {
  exiting: boolean
  onExitComplete: () => void
  children: React.ReactNode
}

export function MessageHover({ exiting, onExitComplete, children }: MessageHoverProps) {
  return (
    <motion.div
      className="pointer-events-none"
      initial={false}
      animate={
        exiting
          ? { opacity: 0, scale: 0.8 }
          : { opacity: 1, scale: 1 }
      }
      transition={{
        duration: exiting ? 1 : 0,
        ease: [0.4, 0, 0.2, 1],
      }}
      onAnimationComplete={() => {
        if (exiting) {
          onExitComplete()
        }
      }}
    >
      {children}
    </motion.div>
  )
}
