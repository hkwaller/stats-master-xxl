import { ImageResponse } from 'next/og'

export const alt = 'Stats Master - Multiplayer NHL Stats Trivia'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const INK = '#14213d'

// Back of a hockey sweater, as drawn by components/game/Jersey.tsx.
const SWEATER =
  'M44 6 L12 16 L1 88 L21 93 L31 48 L31 123 L89 123 L89 48 L99 93 L119 88 L108 16 L76 6 Q60 13 44 6 Z'

function Sweater({ body, number, tilt }: { body: string; number: number; tilt: number }) {
  return (
    <div style={{ display: 'flex', position: 'relative', width: 150, height: 160, transform: `rotate(${tilt}deg)` }}>
      <svg width="150" height="160" viewBox="0 0 120 128">
        <path d={SWEATER} fill={body} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <rect x="31" y="103" width="58" height="9" fill="#ffffff" />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 62,
          display: 'flex',
          justifyContent: 'center',
          fontSize: 52,
          fontWeight: 800,
          color: INK,
        }}
      >
        {number}
      </div>
    </div>
  )
}

/**
 * The share card, in Cards on Ice: pale pond ice, a white card in an ink frame
 * with a hard offset, a lemon stamp and three sweaters.
 *
 * Satori has no access to next/font here, so this leans on weight and scale
 * rather than the Anton face.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#e9f6ff',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: 1060,
          height: 500,
          padding: '56px 60px',
          background: '#ffffff',
          border: `6px solid ${INK}`,
          borderRadius: 32,
          boxShadow: `14px 14px 0 ${INK}`,
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              background: '#2357ff',
              color: '#ffffff',
              borderRadius: 999,
              padding: '10px 22px',
              fontSize: 24,
              letterSpacing: '0.08em',
            }}
          >
            MULTIPLAYER · 2–8 PLAYERS · FREE
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: 34,
              fontSize: 96,
              lineHeight: 0.95,
              fontWeight: 800,
              color: INK,
            }}
          >
            <span>KNOW HOCKEY.</span>
            <span>PICK YOUR SWEATER.</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              marginTop: 18,
              background: '#ffd84d',
              border: `5px solid ${INK}`,
              borderRadius: 16,
              padding: '4px 20px',
              fontSize: 72,
              fontWeight: 800,
              color: INK,
              transform: 'rotate(-2deg)',
            }}
          >
            NAME THE CARD.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
          <Sweater body="#ff7a1a" number={9} tilt={-8} />
          <Sweater body="#2bc48a" number={19} tilt={6} />
        </div>
      </div>
    </div>,
    { ...size },
  )
}
