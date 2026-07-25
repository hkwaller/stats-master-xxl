import { ImageResponse } from 'next/og'

export const alt = 'Stats Master — Multiplayer NHL Stats Trivia'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '80px',
          background: '#eaf1fb',
          backgroundImage:
            'linear-gradient(135deg, #eaf1fb 0%, #d6e4f7 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: '#e32437',
            color: '#fff',
            border: '4px solid #0a1535',
            borderRadius: 9999,
            padding: '14px 30px',
            fontSize: 30,
            fontWeight: 900,
            letterSpacing: '0.12em',
            boxShadow: '0 8px 0 #0a1535',
          }}
        >
          🏒 MULTIPLAYER · 2–8 PLAYERS
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 46,
            fontSize: 132,
            lineHeight: 0.92,
            fontWeight: 900,
            color: '#0a1535',
            letterSpacing: '-0.02em',
          }}
        >
          <span>
            <span style={{ color: '#003087', marginRight: '0.28em' }}>FIVE</span>STATS.
          </span>
          <span>
            <span style={{ color: '#e32437', marginRight: '0.28em' }}>ONE</span>LEGEND.
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 40,
            fontSize: 34,
            color: '#0a1535',
            opacity: 0.75,
            maxWidth: 900,
          }}
        >
          Couch-co-op NHL trivia — guess the player from their stats.
        </div>
      </div>
    ),
    { ...size },
  )
}
