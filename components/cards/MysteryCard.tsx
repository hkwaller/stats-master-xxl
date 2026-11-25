'use client'

import { motion, AnimatePresence } from 'framer-motion'

const INK = 'var(--color-ink)'

export interface CardChip {
  label: string
  /** null while the hint is still face down. */
  value: string | null
}

/**
 * The tilted trading card on the TV. Face down it shows a silhouette, a "?" and
 * the hints flipped so far; revealed it carries the player's name on a lemon
 * nameplate. An optional stamp (GOAL!, NO GOAL) slaps across the corner.
 */
export function MysteryCard({
  season,
  cardNumber,
  chips,
  revealed,
  stamp,
}: {
  season: string
  cardNumber: number
  chips: CardChip[]
  revealed?: { name: string; detail: string } | null
  stamp?: { text: string; tone: 'mint' | 'pink' } | null
}) {
  return (
    <div className="relative">
      <div
        className="flex flex-col gap-2.5"
        style={{
          transform: 'rotate(-3deg)',
          background: '#ffffff',
          border: `3px solid ${INK}`,
          borderRadius: 20,
          padding: 12,
          boxShadow: `8px 8px 0 ${INK}`,
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{ background: 'var(--color-cobalt)', color: '#fff', borderRadius: 10, padding: '8px 14px' }}
        >
          <span className="font-display" style={{ fontSize: 30, lineHeight: 1 }}>
            {season.replace('-', '–')}
          </span>
          <span className="font-mono" style={{ fontSize: 13, fontWeight: 700 }}>
            NO. {String(cardNumber).padStart(3, '0')}
          </span>
        </div>

        <div
          className="relative flex items-center justify-center overflow-hidden"
          style={{
            height: 300,
            borderRadius: 10,
            backgroundColor: '#cfe6ff',
            backgroundImage: 'radial-gradient(#a9cdf6 2px, transparent 2.3px)',
            backgroundSize: '10px 10px',
          }}
        >
          <svg
            aria-hidden="true"
            width="220"
            height="280"
            viewBox="0 0 220 280"
            style={{ position: 'absolute', bottom: -6 }}
          >
            <path
              d="M110 30 C 80 30, 70 60, 74 86 C 78 112, 92 124, 110 124 C 128 124, 142 112, 146 86 C 150 60, 140 30, 110 30 Z M30 280 C 30 190, 60 150, 110 146 C 160 150, 190 190, 190 280 Z"
              fill="#14213d"
            />
          </svg>
          {!revealed && (
            <span
              aria-hidden="true"
              className="font-display relative"
              style={{ fontSize: 150, lineHeight: 1, color: '#ffffff', WebkitTextStroke: '4px #14213d' }}
            >
              ?
            </span>
          )}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pr-3">
            {chips.map((chip) => (
              <span
                key={chip.label}
                className="font-mono"
                style={{
                  background: chip.value ? '#ffffff' : 'rgba(255,255,255,0.55)',
                  border: chip.value ? `2px solid ${INK}` : '2px dashed var(--color-ink-2)',
                  borderRadius: 999,
                  padding: '3px 10px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: chip.value ? INK : 'var(--color-ink-2)',
                }}
              >
                {chip.value ?? `${chip.label} ?`}
              </span>
            ))}
          </div>
        </div>

        <div
          className="flex flex-col gap-0.5"
          style={{
            background: revealed ? 'var(--color-lemon)' : 'var(--color-tangerine)',
            color: INK,
            borderRadius: 10,
            padding: '10px 14px',
          }}
        >
          <span
            className={`font-display ${revealed ? 'reveal-name' : ''}`}
            style={{ fontSize: revealed && revealed.name.length > 14 ? 30 : 36, lineHeight: 1 }}
          >
            {revealed ? revealed.name.toUpperCase() : 'WHO IS IT?'}
          </span>
          {revealed && (
            <span className="font-mono" style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase' }}>
              {revealed.detail}
            </span>
          )}
        </div>
      </div>

      <AnimatePresence>
        {stamp && (
          <motion.span
            key={stamp.text}
            initial={{ opacity: 0, rotate: 18, scale: 1.25 }}
            animate={{ opacity: 1, rotate: 10, scale: 1 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="font-display absolute"
            style={{
              top: 150,
              right: -30,
              background: stamp.tone === 'mint' ? 'var(--color-mint)' : 'var(--color-pink)',
              color: INK,
              border: `3px solid ${INK}`,
              borderRadius: 10,
              padding: '6px 16px',
              fontSize: 44,
              lineHeight: 1,
              boxShadow: `4px 4px 0 ${INK}`,
            }}
          >
            {stamp.text}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
