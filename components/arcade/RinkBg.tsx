interface RinkBgProps {
  opacity?: number
  className?: string
}

export function RinkBg({ opacity = 0.1, className = '' }: RinkBgProps) {
  return (
    <svg
      viewBox="0 0 800 500"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        opacity,
        pointerEvents: 'none',
      }}
    >
      {/* Outer rink border */}
      <rect
        x="15"
        y="15"
        width="770"
        height="470"
        rx="120"
        ry="80"
        fill="none"
        stroke="#003087"
        strokeWidth="5"
      />
      {/* Blue lines */}
      <line x1="267" y1="15" x2="267" y2="485" stroke="#003087" strokeWidth="4" />
      <line x1="533" y1="15" x2="533" y2="485" stroke="#003087" strokeWidth="4" />
      {/* Center red dashed line */}
      <line
        x1="400"
        y1="15"
        x2="400"
        y2="485"
        stroke="#e32437"
        strokeWidth="4"
        strokeDasharray="18 10"
      />
      {/* Center circle */}
      <circle cx="400" cy="250" r="80" fill="none" stroke="#e32437" strokeWidth="4" />
      {/* Center dot */}
      <circle cx="400" cy="250" r="6" fill="#e32437" />
      {/* Corner face-off circles */}
      <circle cx="185" cy="125" r="55" fill="none" stroke="#003087" strokeWidth="3" />
      <circle cx="185" cy="375" r="55" fill="none" stroke="#003087" strokeWidth="3" />
      <circle cx="615" cy="125" r="55" fill="none" stroke="#003087" strokeWidth="3" />
      <circle cx="615" cy="375" r="55" fill="none" stroke="#003087" strokeWidth="3" />
    </svg>
  )
}
