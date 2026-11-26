import type { Jersey as JerseyData, JerseyPattern } from '@/types/game'

const INK = '#14213d'

// A hockey sweater laid flat, back view: boxy body, long sleeves to the wrist.
const BODY =
  'M44 6 L12 16 L1 88 L21 93 L31 48 L31 123 L89 123 L89 48 L99 93 L119 88 L108 16 L76 6 Q60 13 44 6 Z'
const COLLAR = 'M44 6 Q60 13 76 6 L74 11 Q60 19 46 11 Z'
const YOKE = 'M44 6 L12 16 L8.94 36 L111.06 36 L108 16 L76 6 Q60 13 44 6 Z'
const SLEEVE_A = ['5.18,60.64 26.98,66.09 25.72,71.76 4.3,66.4', '114.82,60.64 93.02,66.09 94.28,71.76 115.7,66.4']
const SLEEVE_B = ['3.64,70.72 24.78,76 23.99,79.55 3.09,74.32', '116.36,70.72 95.22,76 96.01,79.55 116.91,74.32']

function Pattern({ pattern, trim }: { pattern: JerseyPattern; trim: string }) {
  switch (pattern) {
    case 'yoke':
      return <path d={YOKE} fill={trim} />
    case 'hoops':
      return (
        <g fill={trim}>
          {SLEEVE_A.map((p) => (
            <polygon key={p} points={p} />
          ))}
          <rect x={31} y={104} width={58} height={9} />
        </g>
      )
    case 'sleeves':
      return (
        <g fill={trim}>
          {[...SLEEVE_A, ...SLEEVE_B].map((p) => (
            <polygon key={p} points={p} />
          ))}
          <rect x={31} y={106} width={58} height={3} />
          <rect x={31} y={113} width={58} height={3} />
        </g>
      )
    case 'sash':
      return <polygon points="31,60 31,76 89,116 89,100" fill={trim} />
    case 'chevron':
      return <polygon points="31,100 60,111 89,100 89,109 60,120 31,109" fill={trim} />
    default:
      return null
  }
}

/**
 * A player's sweater, back view, with nickname and number. Below 72px the
 * nameplate drops off and only the number identifies the player.
 */
export function Jersey({
  jersey,
  name,
  size = 120,
  showName,
  className = '',
  decorative = false,
}: {
  jersey: JerseyData
  name?: string
  size?: number
  showName?: boolean
  className?: string
  /** Set when a visible name sits next to the jersey, so it isn't announced twice. */
  decorative?: boolean
}) {
  const nameplate = (showName ?? size >= 72) && name ? name.toUpperCase().slice(0, 10) : ''
  const nameSize = nameplate.length > 6 ? 10 : 12
  const height = Math.round((size * 128) / 120)
  const label = `Jersey number ${jersey.number}${name ? `, ${name}` : ''}`

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 120 128"
      className={`shrink-0 ${className}`}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
    >
      <path d={BODY} fill={jersey.body} />
      <Pattern pattern={jersey.pattern} trim={jersey.trim} />
      <path d={COLLAR} fill={jersey.trim} stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
      <path d={BODY} fill="none" stroke={INK} strokeWidth={size < 48 ? 5 : 3} strokeLinejoin="round" />
      {nameplate && (
        <text
          x={60}
          y={55}
          textAnchor="middle"
          fontFamily="var(--font-display), Anton, sans-serif"
          fontSize={nameSize}
          letterSpacing={0.6}
          fill={INK}
        >
          {nameplate}
        </text>
      )}
      <text
        x={60}
        y={nameplate ? 99 : 96}
        textAnchor="middle"
        fontFamily="var(--font-display), Anton, sans-serif"
        fontSize={nameplate ? 40 : 52}
        fill={INK}
        stroke={jersey.trim}
        strokeWidth={size < 48 ? 2 : 1.2}
        paintOrder="stroke"
      >
        {jersey.number}
      </text>
    </svg>
  )
}
