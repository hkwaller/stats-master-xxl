'use client'

import { useState, useEffect } from 'react'
import { Pause } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button, MonoLabel } from '@/components/design-system'
import { PlayerNameInput } from './PlayerNameInput'

const INK = 'var(--color-ink)'
const RED = 'var(--color-red)'
export const BUZZER_HEIGHT = 84

interface BuzzInButtonProps {
  playerId: string
  buzzedInPlayerId: string // '' if nobody
  lockedOutPlayers: string[]
  onCancel: () => void
  onBuzzIn: () => void
  onSubmitAnswer: (answer: string) => void
}

/** A hairline-bounded status plane - locked out, or someone else has the puck. */
function StatusPlane({
  label,
  detail,
  tone,
}: {
  label: string
  detail: string
  tone: 'dead' | 'wait'
}) {
  return (
    <div
      className={`on-ice px-5 py-6 text-center ${tone === 'dead' ? 'penalty-hatch' : ''}`}
      style={{
        borderLeft: `5px solid ${tone === 'dead' ? '#b3c0cf' : INK}`,
        boxShadow: tone === 'dead' ? 'none' : undefined,
      }}
    >
      <p
        className="font-display m-0"
        style={{
          fontWeight: 800,
          fontSize: 28,
          lineHeight: 1,
          textTransform: 'uppercase',
          color: tone === 'dead' ? '#6b7a8c' : INK,
        }}
      >
        {label}
      </p>
      <p className="mt-2 mb-0">
        <MonoLabel size={9}>{detail}</MonoLabel>
      </p>
    </div>
  )
}

export function BuzzInButton({
  playerId,
  buzzedInPlayerId,
  lockedOutPlayers,
  onBuzzIn,
  onCancel,
  onSubmitAnswer,
}: BuzzInButtonProps) {
  const isLockedOut = lockedOutPlayers.includes(playerId)
  const isBuzzed = buzzedInPlayerId === playerId
  const someoneElseBuzzed = buzzedInPlayerId !== '' && buzzedInPlayerId !== playerId

  const [answer, setAnswer] = useState('')

  // Clear the field when the buzz state resets between rounds.
  useEffect(() => {
    if (!isBuzzed) setAnswer('')
  }, [isBuzzed])

  if (isLockedOut) {
    return (
      <StatusPlane
        label="Penalty box"
        detail="Wrong guess - watch the remaining reveals"
        tone="dead"
      />
    )
  }

  if (someoneElseBuzzed) {
    return <StatusPlane label="Someone else buzzed" detail="Seasons paused until they respond" tone="wait" />
  }

  if (isBuzzed) {
    return (
      <div className="on-ice flex flex-col gap-4 p-4" aria-label="Your answer">
        <div className="career-possession flex flex-col gap-2 px-4 py-4" style={{ background: RED, color: 'var(--color-ice-0)' }}>
          <span className="font-display text-[26px] leading-none font-extrabold uppercase">
            You have the puck
          </span>
          <span className="flex items-center gap-2 text-sm">
            <Pause size={14} strokeWidth={2.4} aria-hidden="true" />
            Seasons paused. Name the player or cancel.
          </span>
        </div>

        <PlayerNameInput value={answer} setValue={setAnswer} onSubmit={onSubmitAnswer} placeholder="Player name…" autoFocus />
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink-2">Not sure? Give up the puck.</span>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}
            className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-line"
            style={{ minHeight: 44, minWidth: 96 }}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  // Default: the buzzer, pinned to the bottom of the phone.
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40"
      style={{ background: RED, paddingBottom: 'env(safe-area-inset-bottom, 0px)', boxShadow: '0 -1px 0 rgba(13,27,42,0.10)' }}
    >
      <motion.button
        onClick={onBuzzIn}
        whileTap={{ y: 1 }}
        transition={{ duration: 0.1 }}
        className="btn-ice font-display w-full"
        style={{
          background: RED,
          border: 'none',
          color: '#fff',
          minHeight: BUZZER_HEIGHT,
          padding: '20px 0',
          lineHeight: '1',
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        Buzz in
      </motion.button>
    </div>
  )
}
