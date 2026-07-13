'use client'

import { motion } from 'framer-motion'

type TileSize = 'lg' | 'md' | 'sm'

interface StatTileProps {
  abbr: string
  value: string | number
  highlight?: boolean
  hidden?: boolean
  size?: TileSize
  className?: string
}

const SIZES: Record<TileSize, {
  outerRadius: number
  outerPad: number
  innerRadius: number
  innerPadV: number
  labelSize: number
  digitSize: number
  minHeight: number
  gap: number
}> = {
  lg: { outerRadius: 14, outerPad: 6, innerRadius: 9, innerPadV: 12, labelSize: 10, digitSize: 40, minHeight: 92, gap: 8 },
  md: { outerRadius: 12, outerPad: 5, innerRadius: 8, innerPadV: 9,  labelSize: 9,  digitSize: 20, minHeight: 58, gap: 6 },
  sm: { outerRadius: 10, outerPad: 4, innerRadius: 7, innerPadV: 6,  labelSize: 7,  digitSize: 16, minHeight: 46, gap: 4 },
}

export function StatTile({
  abbr,
  value,
  highlight = false,
  hidden = false,
  size = 'lg',
  className = '',
}: StatTileProps) {
  const s = SIZES[size]

  const panelGradient = highlight
    ? 'linear-gradient(180deg, #c0182a 0%, #8f1220 100%)'
    : 'linear-gradient(180deg, #00266b 0%, #001c50 100%)'

  const labelColor = highlight ? '#ffb9c2' : '#9db9f0'

  // Shrink the digit for longer values so 3–4 char stats never clip the panel.
  const valueLen = String(value).length
  const digitSize =
    valueLen >= 4 ? s.digitSize * 0.62 :
    valueLen === 3 ? s.digitSize * 0.78 :
    s.digitSize

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      className={className}
      style={{
        background: '#ffffff',
        border: '2px solid #0a1535',
        borderRadius: s.outerRadius,
        boxShadow: '0 4px 0 #0a1535',
        padding: s.outerPad,
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* HOT! badge on the revealed highlight stat */}
      {highlight && !hidden && (
        <div
          style={{
            position: 'absolute',
            top: -9,
            right: -9,
            zIndex: 3,
            background: '#ffcf33',
            border: '2px solid #0a1535',
            borderRadius: 8,
            padding: '2px 7px',
            fontFamily: 'var(--font-archivo-black), "Archivo Black", sans-serif',
            fontSize: size === 'sm' ? 8 : 10,
            fontWeight: 900,
            color: '#0a1535',
            transform: 'rotate(10deg)',
            whiteSpace: 'nowrap',
            lineHeight: 1.3,
            letterSpacing: '0.06em',
          }}
        >
          HOT!
        </div>
      )}

      {/* Inner jumbotron panel */}
      <div
        style={{
          background: panelGradient,
          border: '1.5px solid #0a1535',
          borderRadius: s.innerRadius,
          padding: `${s.innerPadV}px 6px ${Math.max(6, s.innerPadV - 3)}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: s.gap,
          position: 'relative',
          overflow: 'hidden',
          boxShadow:
            'inset 0 2px 0 rgba(255,255,255,0.12), inset 0 -8px 16px rgba(0,0,0,0.3)',
          minHeight: s.minHeight,
        }}
      >
        {/* Label chip */}
        <div
          style={{
            background: 'rgba(0,0,0,0.35)',
            color: labelColor,
            padding: size === 'sm' ? '1px 6px' : '2px 8px',
            borderRadius: 4,
            fontFamily: 'var(--font-archivo-black), "Archivo Black", sans-serif',
            fontSize: s.labelSize,
            fontWeight: 900,
            letterSpacing: '0.2em',
            lineHeight: 1,
          }}
        >
          {abbr}
        </div>

        {/* Digit or hidden placeholder */}
        {hidden ? (
          <div
            style={{
              width: size === 'lg' ? 44 : 28,
              height: s.digitSize * 0.7,
              background: 'rgba(255,255,255,0.14)',
              borderRadius: 6,
              marginTop: 2,
            }}
          />
        ) : (
          <div
            style={{
              fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
              fontSize: digitSize,
              lineHeight: 0.9,
              color: '#ffffff',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {String(value)}
          </div>
        )}
      </div>
    </motion.div>
  )
}
