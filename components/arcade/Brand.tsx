'use client'

interface CMascotProps {
  size?: number
  /** kept for API compatibility; the mark is a single navy puck disc */
  mood?: 'happy' | 'sad'
  /** render for a dark background */
  light?: boolean
}

/** Puck-disc logo mark (seen edge-on: a filled circle with a light bar). */
export function CMascot({ size = 34, light = false }: CMascotProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle
        cx="20"
        cy="20"
        r="19"
        fill={light ? '#20305f' : '#0a1535'}
        stroke={light ? 'rgba(255,255,255,0.35)' : 'none'}
        strokeWidth={light ? 1.5 : 0}
      />
      <rect x="9" y="17.5" width="22" height="5" rx="2.5" fill="#f4f8ff" />
    </svg>
  )
}

interface CBrandProps {
  small?: boolean
  subtitle?: string
  light?: boolean
  className?: string
}

export function CBrand({ small = false, subtitle, light = false, className = '' }: CBrandProps) {
  const wordmarkSize = small ? 15 : 17
  const logoSize = small ? 30 : 34

  return (
    <div
      className={`inline-flex items-center ${className}`}
      style={{ gap: small ? 8 : 10 }}
    >
      <CMascot size={logoSize} light={light} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
            fontSize: wordmarkSize,
            lineHeight: 1,
            color: light ? '#ffffff' : '#0a1535',
            letterSpacing: '-0.01em',
          }}
        >
          STATS<span style={{ color: '#e32437' }}>!</span>MASTER
        </span>
        {subtitle && (
          <span
            style={{
              fontFamily: 'var(--font-jetbrains-mono), "JetBrains Mono", monospace',
              fontSize: 8,
              lineHeight: 1,
              color: light ? '#9db9f0' : '#6b7ea0',
              letterSpacing: '0.24em',
              marginTop: 1,
            }}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  )
}
