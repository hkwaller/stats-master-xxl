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
    <div
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: light ? '#ffffff' : '#0d1b2a',
      }}
    >
      <div
        style={{
          width: size * 0.535,
          height: Math.max(2, Math.round(size * 0.107)),
          borderRadius: 2,
          background: light ? '#0d1b2a' : '#eef3f9',
        }}
      />
    </div>
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
