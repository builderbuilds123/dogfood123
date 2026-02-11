export function BlackholeVortex({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-[160px] h-[160px]',
    md: 'w-[clamp(240px,45vw,400px)] h-[clamp(240px,45vw,400px)]',
    lg: 'w-[clamp(300px,55vw,500px)] h-[clamp(300px,55vw,500px)]',
  }

  return (
    <div className={`blackhole-container ${sizeClasses[size]}`}>
      <div className="blackhole-aura" />
      <div className="blackhole-ring" />
      <div className="blackhole-disc" />
      <div className="blackhole-horizon" />
      <div className="blackhole-singularity" />
    </div>
  )
}
