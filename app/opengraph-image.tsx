import { ImageResponse } from 'next/og'

export const alt = 'Stats Master - Multiplayer NHL Stats Trivia'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * The share card, in the "On the Ice" system: white ice, navy ink, one red
 * accent, and an amber kickplate along the foot of the boards.
 *
 * Satori has no access to next/font here, so this leans on weight and scale
 * rather than the Big Shoulders face.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(178deg, #ffffff 0%, #eef3f9 38%, #e4ecf5 100%)',
      }}
    >
      {/* Rink geometry: two blue lines and the red centre line. */}
      <div style={{ position: 'absolute', left: '31%', top: 0, bottom: 0, width: 8, background: 'rgba(11,83,201,0.10)' }} />
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 8, background: 'rgba(207,10,44,0.10)' }} />
      <div style={{ position: 'absolute', left: '69%', top: 0, bottom: 0, width: 8, background: 'rgba(11,83,201,0.10)' }} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          flex: 1,
          padding: '76px 80px 0',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            background: '#0d1b2a',
            color: '#ffffff',
            padding: '14px 22px',
            fontSize: 24,
            letterSpacing: '0.26em',
          }}
        >
          MULTIPLAYER · 2–8 PLAYERS · FREE
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 44,
            fontSize: 118,
            lineHeight: 0.9,
            fontWeight: 800,
            color: '#0d1b2a',
            letterSpacing: '-0.02em',
          }}
        >
          <span>FIVE STATS.</span>
          <span>ONE LEGEND.</span>
          <span style={{ color: '#cf0a2c' }}>TWELVE SECONDS.</span>
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 36,
            fontSize: 30,
            color: '#55677d',
            maxWidth: 880,
          }}
        >
          Guess the NHL skater from a season stat line before the room beats you to it.
        </div>
      </div>

      {/* Kickplate — the padding at the base of the boards. */}
      <div style={{ display: 'flex', height: 14, background: '#f2b21c' }} />
    </div>,
    { ...size },
  )
}
