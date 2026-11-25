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
        background: 'linear-gradient(178deg, #ffffff 0%, #e9f6ff 38%, #dcebfa 100%)',
      }}
    >
      {/* Rink geometry: two blue lines and the red centre line. */}
      <div
        style={{
          position: 'absolute',
          left: '31%',
          top: 0,
          bottom: 0,
          width: 8,
          background: 'rgba(35, 87, 255,0.10)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: 8,
          background: 'rgba(35, 87, 255,0.10)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '69%',
          top: 0,
          bottom: 0,
          width: 8,
          background: 'rgba(35, 87, 255,0.10)',
        }}
      />

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
            background: '#14213d',
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
            color: '#14213d',
            letterSpacing: '-0.02em',
          }}
        >
          <span>KNOW HOCKEY.</span>
          <span>PICK YOUR MODE.</span>
          <span style={{ color: '#2357ff' }}>PROVE IT.</span>
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 36,
            fontSize: 30,
            color: '#4a5a78',
            maxWidth: 880,
          }}
        >
          Classic, Career, Head-to-Head or Higher / Lower. Bring your hockey knowledge.
        </div>
      </div>

      {/* Kickplate - the padding at the base of the boards. */}
      <div style={{ display: 'flex', height: 14, background: '#ffd84d' }} />
    </div>,
    { ...size },
  )
}
