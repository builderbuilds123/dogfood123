'use client'

import { useMemo, useRef, useEffect } from 'react'
import { motion, useAnimationControls } from 'motion/react'

type Phase = 'entering' | 'hovering' | 'exiting'

interface MessageFromBlackholeProps {
  children: React.ReactNode
  angle: number // radians — direction to radiate outward
  phase: Phase
  onEnterComplete?: () => void
  onExitComplete?: () => void
}

const EMIT_RADIUS = 160 // px from center where message stops

export function MessageFromBlackhole({
  children,
  angle,
  phase,
  onEnterComplete,
  onExitComplete,
}: MessageFromBlackholeProps) {
  const controls = useAnimationControls()

  // Use refs for callbacks so the effect only triggers on phase/target changes
  const onEnterCompleteRef = useRef(onEnterComplete)
  onEnterCompleteRef.current = onEnterComplete
  const onExitCompleteRef = useRef(onExitComplete)
  onExitCompleteRef.current = onExitComplete

  const target = useMemo(() => ({
    x: Math.cos(angle) * EMIT_RADIUS,
    y: Math.sin(angle) * EMIT_RADIUS,
  }), [angle])

  useEffect(() => {
    if (phase === 'entering') {
      controls.start({
        x: target.x,
        y: target.y,
        scale: 1,
        opacity: 1,
        transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
      }).then(() => {
        onEnterCompleteRef.current?.()
      })
    } else if (phase === 'exiting') {
      controls.start({
        opacity: 0,
        scale: 0.8,
        transition: { duration: 1, ease: [0.4, 0, 0.2, 1] },
      }).then(() => {
        onExitCompleteRef.current?.()
      })
    }
    // 'hovering' — no animation change, the element stays at its final position
  }, [phase, controls, target])

  return (
    <motion.div
      className="absolute z-10 pointer-events-none"
      style={{ left: '50%', top: '50%', translateX: '-50%', translateY: '-50%' }}
      initial={{
        x: 0,
        y: 0,
        scale: 0,
        opacity: 0,
      }}
      animate={controls}
    >
      {children}
    </motion.div>
  )
}
