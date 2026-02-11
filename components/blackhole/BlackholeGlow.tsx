export function BlackholeGlow() {
  return (
    <>
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, transparent 40%, rgba(139, 0, 255, 0.08) 60%, transparent 80%)',
          animation: 'pulse-ring 5s ease-in-out infinite',
          filter: 'blur(40px)',
          inset: '-30%',
        }}
      />
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, transparent 50%, rgba(0, 255, 255, 0.05) 65%, transparent 80%)',
          animation: 'pulse-ring 7s ease-in-out infinite reverse',
          filter: 'blur(50px)',
          inset: '-40%',
        }}
      />
    </>
  )
}
