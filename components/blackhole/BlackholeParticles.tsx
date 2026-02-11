'use client'

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
  'rgba(139, 0, 255, 0.8)',
  'rgba(255, 0, 255, 0.6)',
  'rgba(0, 255, 255, 0.5)',
  'rgba(139, 0, 255, 0.6)',
  'rgba(255, 0, 255, 0.5)',
]

// Deterministic pseudo-random to avoid hydration mismatch
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const rand = seededRandom(i * 1000 + 42)
    return {
      id: i,
      orbitRadius: `${80 + rand() * 100}px`,
      duration: `${12 + rand() * 18}s`,
      delay: `${-rand() * 20}s`,
      size: `${1.5 + rand() * 2}px`,
      color: COLORS[Math.floor(rand() * COLORS.length)],
      opacity: 0.2 + rand() * 0.5,
    }
  })
}

// Pre-compute particles at module level so server and client get identical values
const PARTICLES_CACHE: Record<number, Particle[]> = {}
function getParticles(count: number): Particle[] {
  if (!PARTICLES_CACHE[count]) {
    PARTICLES_CACHE[count] = generateParticles(count)
  }
  return PARTICLES_CACHE[count]
}

export function BlackholeParticles({ count = 12 }: { count?: number }) {
  const particles = getParticles(count)

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
            boxShadow: `0 0 4px ${p.color}`,
            animation: `particle-float ${p.duration} linear infinite`,
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
