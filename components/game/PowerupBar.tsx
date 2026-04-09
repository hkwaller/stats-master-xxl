'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AnswerMode, PowerupType, RevealMode } from '@/types/game'
import { Modal, Button } from '@/components/design-system'

interface PowerupBarProps {
  charges: Record<PowerupType, number> // current charges for this player
  answerMode: AnswerMode
  revealMode: RevealMode
  command: string
  onActivate: (type: PowerupType) => void
}

const POWERUPS: {
  type: PowerupType
  emoji: string
  label: string
  description: string
  availableIn: (answerMode: AnswerMode, revealMode: RevealMode) => boolean
}[] = [
  {
    type: 'eliminate',
    emoji: '✂️',
    label: 'Eliminate',
    description: 'Remove 2 wrong choices from the board',
    availableIn: (mode) => mode === 'multiplechoice',
  },
  {
    type: 'doubledown',
    emoji: '💰',
    label: 'Double Down',
    description: '2× points if correct — lose 50 if wrong',
    availableIn: () => true,
  },
  {
    type: 'freeze',
    emoji: '🧊',
    label: 'Freeze',
    description: 'Stop the reveal timer — lock the columns',
    availableIn: (_, revealMode) => revealMode === 'timed',
  },
  {
    type: 'extrahint',
    emoji: '⚡',
    label: 'Rush',
    description: 'Reveal the next stat column immediately',
    availableIn: (_, revealMode) => revealMode === 'timed',
  },
]

export function PowerupBar({
  charges,
  answerMode,
  revealMode,
  command,
  onActivate,
}: PowerupBarProps) {
  const [confirming, setConfirming] = useState<PowerupType | null>(null)

  const isAnswering = command === 'answering'

  function handleClick(type: PowerupType) {
    setConfirming(type)
  }

  function handleConfirm() {
    if (!confirming) return
    onActivate(confirming)
    setConfirming(null)
  }

  const confirmPowerup = POWERUPS.find((p) => p.type === confirming)

  return (
    <>
      <div className="flex items-center gap-2 justify-center flex-wrap">
        {POWERUPS.map((powerup) => {
          const charge = charges[powerup.type] ?? 0
          const isAvailable = powerup.availableIn(answerMode, revealMode)
          const canUse = isAvailable && charge > 0 && isAnswering

          return (
            <motion.button
              key={powerup.type}
              onClick={() => canUse && handleClick(powerup.type)}
              disabled={!canUse}
              whileTap={canUse ? { scale: 0.95 } : undefined}
              whileHover={canUse ? { scale: 1.05 } : undefined}
              title={powerup.label}
              className={`
                relative flex flex-col items-center gap-1 px-4 py-3 rounded-xl border
                transition-all duration-150 min-w-[72px]
                ${
                  canUse
                    ? 'bg-game-card-dark border-game-card-border cursor-pointer hover:border-ice-blue/50 hover:bg-ice-blue/10'
                    : 'bg-game-card-dark/50 border-game-card-border/30 opacity-40 cursor-not-allowed'
                }
              `}
            >
              <span className="text-2xl">{powerup.emoji}</span>
              <span className="text-xs font-bold uppercase tracking-wide text-game-text-muted">
                {powerup.label}
              </span>
              {charge > 0 && (
                <span className="absolute -top-1 -right-1 bg-game-gold text-game-bg text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {charge}
                </span>
              )}
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence>
        {confirming && confirmPowerup && (
          <Modal open onClose={() => setConfirming(null)}>
            <div className="text-center space-y-4">
              <div className="text-5xl">{confirmPowerup.emoji}</div>
              <h3 className="text-xl font-bold uppercase tracking-widest">
                {confirmPowerup.label}
              </h3>
              <p className="text-game-text-muted text-sm">{confirmPowerup.description}</p>
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1" onClick={() => setConfirming(null)}>
                  Cancel
                </Button>
                <Button variant="primary" className="flex-1" onClick={handleConfirm}>
                  Use It
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  )
}
