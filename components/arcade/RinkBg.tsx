import type { CSSProperties } from 'react'

interface RinkBgProps {
  intensity?: number
  className?: string
}

/** Regulation-inspired markings: blue lines, centre line, five faceoff circles,
 * goal lines and creases. Decorative geometry stays behind opaque UI surfaces. */
export function RinkBg({ intensity = 1, className = '' }: RinkBgProps) {
  return (
    <div aria-hidden="true" className={`rink-surface pointer-events-none absolute inset-0 overflow-hidden ${className}`} style={{ '--rink-intensity': intensity } as CSSProperties}>
      <svg viewBox="0 0 1000 560" fill="none" className="rink-markings" preserveAspectRatio="xMidYMid slice">
        <rect x="20" y="20" width="960" height="520" rx="150" className="rink-boards" />
        <path d="M350 22v516M650 22v516" className="rink-blue" strokeWidth="9" />
        <path d="M500 22v516" className="rink-red" strokeWidth="7" strokeDasharray="14 8" />
        <circle cx="500" cy="280" r="79" className="rink-blue" strokeWidth="3" />
        <circle cx="500" cy="280" r="7" className="rink-blue-fill" />
        <path d="M115 65v430M885 65v430" className="rink-red" strokeWidth="2" />
        <path d="M115 246a34 34 0 0 1 0 68ZM885 246a34 34 0 0 0 0 68Z" className="rink-crease" />
        {[220, 780].flatMap(x => [150, 410].map(y => (
          <g key={`${x}-${y}`} className="rink-red" strokeWidth="2">
            <circle cx={x} cy={y} r="60" />
            <circle cx={x} cy={y} r="5" fill="currentColor" stroke="none" />
            <path d={`M${x-14} ${y-10}v20m28-20v20M${x-10} ${y-63}v-10m20 0v10M${x-10} ${y+63}v10m20-10v10`} />
          </g>
        )))}
        {[405, 595].flatMap(x => [150, 410].map(y => <circle key={`${x}-${y}`} cx={x} cy={y} r="5" className="rink-red-fill" />))}
      </svg>
    </div>
  )
}

export function FaceoffCircle({ size = 560, color = 'rgba(11,83,201,0.10)', style }: { size?: number; color?: string; style?: CSSProperties }) {
  return <div aria-hidden="true" className="pointer-events-none absolute rounded-full" style={{ width: size, height: size, border: `6px solid ${color}`, ...style }} />
}
