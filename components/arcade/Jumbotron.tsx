'use client'

/**
 * The jumbotron — the signature element and the one genuinely dark object in
 * the design. It is the only place amber LED type is used.
 *
 * Outside in: struts (so it reads as hanging from the rafters) → bezel →
 * screen with a dot-matrix overlay → a 5-column cell grid whose 1px gaps show
 * the backing through as grid lines.
 */

export type JumboSize = 'tv' | 'hero' | 'phone'

export interface JumboCell {
  /** Mono abbreviation above the value — GP / G / A / PTS / PIM. */
  abbr: string
  value: string | number
  /** The emphasised stat. Only this cell blooms. */
  emphasis?: boolean
  /** Not yet revealed — renders as a dim LED placeholder. */
  hidden?: boolean
}

interface JumbotronProps {
  cells: JumboCell[]
  size?: JumboSize
  /** Amber chip sitting half-outside the bottom-right corner, e.g. "1987–88 SEASON". */
  caption?: string
  /** Small dim labels along the top of the screen, e.g. season and team. */
  topLeft?: string
  topRight?: string
  /** Cells illuminate left to right from this index. Pass cells.length to light all. */
  revealedCount?: number
  /** Struts above the unit. Off for the phone, where there is no room. */
  struts?: boolean
  className?: string
}

const LED = '#ffb01f'
const LED_DIM = 'rgba(255,176,31,0.6)'
const LED_LABEL = 'rgba(255,176,31,0.55)'
const GLOW = '0 0 14px rgba(255,176,31,0.45), 0 0 40px rgba(255,176,31,0.22)'

const SIZES: Record<
  JumboSize,
  {
    bezel: number
    screenPad: string
    cellPad: string
    gap: number
    abbr: number
    abbrTrack: string
    value: number
    /** Used for values of three characters or more. */
    valueLong: number
    strutHeight: number
    strutInset: string
    dots: string
  }
> = {
  tv: {
    bezel: 10,
    screenPad: '16px',
    cellPad: '16px 10px 14px',
    gap: 10,
    abbr: 10,
    abbrTrack: '0.3em',
    value: 82,
    valueLong: 72,
    strutHeight: 24,
    strutInset: '22%',
    dots: '4px 4px',
  },
  hero: {
    bezel: 9,
    screenPad: '14px',
    cellPad: '12px 6px 10px',
    gap: 7,
    abbr: 8,
    abbrTrack: '0.24em',
    value: 42,
    valueLong: 38,
    strutHeight: 42,
    strutInset: '26%',
    dots: '4px 4px',
  },
  phone: {
    bezel: 6,
    screenPad: '9px',
    cellPad: '9px 2px 7px',
    gap: 5,
    abbr: 7,
    abbrTrack: '0.18em',
    value: 26,
    valueLong: 24,
    strutHeight: 0,
    strutInset: '26%',
    dots: '3.5px 3.5px',
  },
}

export function Jumbotron({
  cells,
  size = 'tv',
  caption,
  topLeft,
  topRight,
  revealedCount,
  struts = true,
  className = '',
}: JumbotronProps) {
  const s = SIZES[size]
  const lit = revealedCount ?? cells.length
  const showStruts = struts && s.strutHeight > 0

  return (
    <div className={`relative ${className}`}>
      {showStruts && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{
            left: s.strutInset,
            right: s.strutInset,
            top: -s.strutHeight,
            height: s.strutHeight,
            borderLeft: '3px solid rgba(13,27,42,0.21)',
            borderRight: '3px solid rgba(13,27,42,0.21)',
          }}
        />
      )}

      <div className="jumbo-body" style={{ padding: s.bezel }}>
        <div className="jumbo-screen relative overflow-hidden" style={{ padding: s.screenPad }}>
          <div className="jumbo-dots pointer-events-none absolute inset-0" style={{ backgroundSize: s.dots }} />

          <div className="relative flex flex-col" style={{ gap: 12 }}>
            {(topLeft || topRight) && (
              <div className="flex items-center justify-between">
                <span
                  className="font-mono"
                  style={{ fontSize: 9, letterSpacing: '0.28em', color: LED_DIM }}
                >
                  {topLeft}
                </span>
                <span
                  className="font-mono"
                  style={{ fontSize: 9, letterSpacing: '0.28em', color: LED_DIM }}
                >
                  {topRight}
                </span>
              </div>
            )}

            <div
              className="grid grid-cols-5"
              style={{ gap: 1, background: 'rgba(255,255,255,0.07)' }}
            >
              {cells.map((cell, i) => {
                const isLit = i < lit && !cell.hidden
                const bloom = isLit && cell.emphasis
                const valueSize = String(cell.value).length > 2 ? s.valueLong : s.value

                return (
                  <div
                    key={`${cell.abbr}-${i}`}
                    className="flex flex-col items-center"
                    style={{
                      background: '#05070b',
                      padding: s.cellPad,
                      gap: s.gap,
                    }}
                  >
                    <span
                      className="font-mono font-bold"
                      style={{
                        fontSize: s.abbr,
                        letterSpacing: s.abbrTrack,
                        color: LED_LABEL,
                      }}
                    >
                      {cell.abbr}
                    </span>

                    {isLit ? (
                      <span
                        key={`lit-${cell.value}`}
                        className="led-cell-in tabular-nums"
                        style={{
                          fontFamily: 'var(--font-led)',
                          fontWeight: 700,
                          fontSize: valueSize,
                          lineHeight: 0.82,
                          color: bloom ? LED : LED_DIM,
                          textShadow: bloom ? GLOW : 'none',
                          // Cells illuminate left to right, 60ms apart.
                          animationDelay: `${i * 60}ms`,
                        }}
                      >
                        {cell.value}
                      </span>
                    ) : (
                      <span
                        role="img"
                        aria-label={`${cell.abbr} not revealed yet`}
                        style={{
                          display: 'block',
                          width: '55%',
                          height: valueSize * 0.42,
                          background: 'rgba(255,176,31,0.10)',
                        }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {caption && (
        <span
          className="font-mono absolute right-0"
          style={{
            bottom: -11,
            fontSize: 9,
            letterSpacing: '0.2em',
            color: '#0d1b2a',
            background: 'var(--color-amber)',
            padding: '3px 9px',
          }}
        >
          {caption}
        </span>
      )}
    </div>
  )
}

/**
 * The jumbotron used as an announcement board rather than a stat line —
 * the winner on the final screen. Same shell, free-form amber content.
 */
export function JumbotronPanel({
  children,
  bezel = 10,
  screenPad = '22px 26px',
  struts = false,
  className = '',
}: {
  children: React.ReactNode
  bezel?: number
  screenPad?: string
  struts?: boolean
  className?: string
}) {
  return (
    <div className={`relative ${className}`}>
      {struts && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{
            left: '24%',
            right: '24%',
            top: -32,
            height: 32,
            borderLeft: '3px solid rgba(13,27,42,0.21)',
            borderRight: '3px solid rgba(13,27,42,0.21)',
          }}
        />
      )}
      <div className="jumbo-body" style={{ padding: bezel }}>
        <div className="jumbo-screen relative overflow-hidden" style={{ padding: screenPad }}>
          <div className="jumbo-dots pointer-events-none absolute inset-0" />
          <div className="relative">{children}</div>
        </div>
      </div>
    </div>
  )
}
