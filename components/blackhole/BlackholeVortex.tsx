export function BlackholeVortex({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-[180px] h-[180px]',
    md: 'w-[clamp(220px,50vw,450px)] h-[clamp(220px,50vw,450px)]',
    lg: 'w-[clamp(280px,60vw,550px)] h-[clamp(280px,60vw,550px)]',
  }

  return (
    <div className={`blackhole-container ${sizeClasses[size]}`}>
      <div className="blackhole-outer-glow" />
      <div className="blackhole-spiral-1" />
      <div className="blackhole-spiral-2" />
      <div className="blackhole-spiral-3" />
      <div className="blackhole-accretion" />
      <div className="blackhole-event-horizon" />
      <div className="blackhole-singularity" />
    </div>
  )
}
