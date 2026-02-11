export function BlackholeGlow() {
  return (
    <div
      className="absolute inset-0 rounded-full pointer-events-none"
      style={{
        background: 'radial-gradient(circle, transparent 35%, rgba(139, 0, 255, 0.05) 55%, transparent 75%)',
        animation: 'breathe-slow 10s ease-in-out infinite',
        filter: 'blur(50px)',
        inset: '-35%',
      }}
    />
  )
}
