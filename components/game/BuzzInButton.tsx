'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MonoLabel } from '@/components/design-system'
import { PlayerNameInput } from './PlayerNameInput'

const INK = '#0d1b2a'
const RED = '#cf0a2c'

interface BuzzInButtonProps {
  playerId: string
  buzzedInPlayerId: string // '' if nobody
  lockedOutPlayers: string[]
  onBuzzIn: () => void
  onSubmitAnswer: (answer: string) => void
  offsetForDock?: boolean
}

/** A hairline-bounded status plane — locked out, or someone else has the puck. */
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
  onSubmitAnswer,
  offsetForDock = false,
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
        detail="Wrong guess — watch the remaining reveals"
        tone="dead"
      />
    )
  }

  if (someoneElseBuzzed) {
    return <StatusPlane label="Someone else buzzed" detail="Stand by" tone="wait" />
  }

  if (isBuzzed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="flex flex-col gap-3"
      >
        <div
          className="px-4 py-3 text-center"
          style={{ background: RED, color: '#fff' }}
        >
          <span
            className="font-display"
            style={{
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            You have the puck — name him
          </span>
        </div>

        <PlayerNameInput
          value={answer}
          setValue={setAnswer}
          onSubmit={onSubmitAnswer}
          autoFocus
        />
      </motion.div>
    )
  }

  // Default: the buzzer, pinned to the bottom of the phone.
  return (
    <div
      className={`fixed inset-x-0 z-40 ${offsetForDock ? 'bottom-[72px]' : 'bottom-0'}`}
      style={{ background: '#ffffff', boxShadow: '0 -1px 0 rgba(13,27,42,0.10)' }}
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
          padding: '26px 0',
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
