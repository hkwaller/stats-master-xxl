'use client'

interface PuckMarkProps {
  size?: number
  /** Render for a dark background (navy bars, the CTA band, the footer). */
  light?: boolean
  className?: string
}

/** The puck seen edge-on: a navy disc crossed by an ice-coloured bar. */
export function PuckMark({ size = 28, light = false, className = '' }: PuckMarkProps) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 40 40" fill="none" className={`shrink-0 ${className}`}>
      <path d="M5 16v9c0 6 30 6 30 0v-9" fill={light ? 'var(--color-ice-0)' : 'var(--color-ink)'} />
      <ellipse cx="20" cy="16" rx="15" ry="7" fill={light ? 'var(--color-ice-0)' : 'var(--color-ink)'} stroke={light ? 'var(--color-ink)' : 'var(--color-ice-0)'} strokeWidth="1.5" />
      <path d="M9 25c7 3 15 3 22 0" stroke={light ? 'var(--color-ink)' : 'var(--color-ice-0)'} strokeWidth="1.5" />
    </svg>
  )
}

interface BrandProps {
  small?: boolean
  /** Mono line under the wordmark, e.g. a room code. */
  subtitle?: string
  light?: boolean
  className?: string
}

export function CBrand({ small = false, subtitle, light = false, className = '' }: BrandProps) {
  const markSize = small ? 24 : 28
  const wordSize = small ? 17 : 20

  return (
    <div className={`inline-flex items-center gap-[11px] ${className}`}>
      <PuckMark size={markSize} light={light} />
      <div className="flex flex-col gap-[3px]">
        <span
          className="font-display"
          style={{
            fontWeight: 800,
            fontSize: wordSize,
            lineHeight: 1,
            letterSpacing: '0.02em',
            color: light ? '#ffffff' : '#0d1b2a',
          }}
        >
          STATS MASTER
        </span>
        {subtitle && (
          <span
            className="font-mono"
            style={{
              fontSize: 8,
              lineHeight: 1,
              letterSpacing: '0.22em',
              color: light ? 'rgba(255,255,255,0.55)' : '#55677d',
            }}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  )
}
