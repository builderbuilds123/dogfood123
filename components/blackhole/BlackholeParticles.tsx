'use client'

import { useMemo } from 'react'

interface Particle {
  id: number
  orbitRadius: string
  duration: string
  delay: string
  size: string
  color: string
  opacity: number
}

const COLORS = [
  'rgb(255, 0, 255)',
  'rgb(0, 255, 255)',
  'rgb(255, 102, 0)',
  'rgb(139, 0, 255)',
  'rgb(255, 105, 180)',
]

export function BlackholeParticles({ count = 20 }: { count?: number }) {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      orbitRadius: `${100 + Math.random() * 140}px`,
      duration: `${4 + Math.random() * 8}s`,
      delay: `${-Math.random() * 10}s`,
      size: `${2 + Math.random() * 4}px`,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: 0.4 + Math.random() * 0.6,
    }))
  }, [count])

  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 6px ${p.color}`,
            animation: `particle-orbit ${p.duration} linear infinite`,
            animationDelay: p.delay,
            '--orbit-radius': p.orbitRadius,
            '--particle-opacity': p.opacity,
            marginLeft: `calc(-${p.size} / 2)`,
            marginTop: `calc(-${p.size} / 2)`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
