'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Scissors, Snowflake, Zap } from 'lucide-react'
import type { AnswerMode, PowerupType, RevealMode } from '@/types/game'
import { Button, Modal, MonoLabel } from '@/components/design-system'

const INK = '#0d1b2a'
const RED = '#cf0a2c'

interface PowerupBarProps {
  charges: Record<PowerupType, number>
  answerMode: AnswerMode
  revealMode: RevealMode
  command: string
  activeType?: PowerupType | null
  /** Right-hand status, e.g. "STREAK ×2". */
  status?: string
  onActivate: (type: PowerupType) => void
}

const POWERUPS: {
  type: PowerupType
  short: string
  label: string
  description: string
  icon: React.ReactNode
  availableIn: (answerMode: AnswerMode, revealMode: RevealMode) => boolean
}[] = [
  {
    type: 'eliminate',
    short: 'Cut',
    label: 'Eliminate',
    description: 'Remove 2 wrong choices from the board',
    icon: <Scissors size={18} strokeWidth={2} />,
    availableIn: (mode) => mode === 'multiplechoice',
  },
  {
    type: 'doubledown',
    short: 'Double',
    label: 'Double Down',
    description: '2× points if correct — lose 50 if wrong',
    icon: (
      <span className="font-display" style={{ fontWeight: 800, fontSize: 22, lineHeight: 1 }}>
        ×2
      </span>
    ),
    availableIn: () => true,
  },
  {
    type: 'freeze',
    short: 'Freeze',
    label: 'Freeze',
    description: 'Stop the reveal timer — lock the columns',
    icon: <Snowflake size={18} strokeWidth={2} />,
    availableIn: (_, revealMode) => revealMode === 'timed',
  },
  {
    type: 'extrahint',
    short: 'Rush',
    label: 'Rush',
    description: 'Reveal the next stat column immediately',
    icon: <Zap size={18} strokeWidth={2} />,
    availableIn: (_, revealMode) => revealMode === 'timed',
  },
]

/**
 * Fixed to the bottom of the phone on white. A 4-column grid whose 1px gaps
 * show the navy backing through as dividers. Cells are 72px tall — comfortably
 * above the 44px touch minimum at 390px wide.
 */
export function PowerupBar({
  charges,
  answerMode,
  revealMode,
  command,
  activeType,
  status,
  onActivate,
}: PowerupBarProps) {
  const [confirming, setConfirming] = useState<PowerupType | null>(null)
  const isAnswering = command === 'answering'
  const confirmPowerup = POWERUPS.find((p) => p.type === confirming)

  return (
    <>
      <div className="on-ice-header" style={{ boxShadow: '0 -1px 0 rgba(13,27,42,0.10)' }}>
        <div className="flex items-center justify-between px-[18px] pt-3 pb-2">
          <MonoLabel size={9} tracking="0.22em">Power plays</MonoLabel>
          {status && (
            <MonoLabel size={9} tracking="0.14em" color={RED}>
              {status}
            </MonoLabel>
          )}
        </div>

        <div
          className="grid grid-cols-4"
          style={{ gap: 1, background: 'rgba(13,27,42,0.12)' }}
        >
          {POWERUPS.map((pu) => {
            const charge = charges[pu.type] ?? 0
            const available = pu.availableIn(answerMode, revealMode)
            const canUse = available && charge > 0 && isAnswering
            const isActive = activeType === pu.type
            const exhausted = !available || charge === 0

            return (
              <button
                key={pu.type}
                type="button"
                disabled={!canUse}
                onClick={() => canUse && setConfirming(pu.type)}
                className="btn-ice flex flex-col items-center justify-center gap-1.5"
                style={{
                  height: 72,
                  border: 'none',
                  background: isActive ? RED : exhausted ? '#f4f7fa' : '#ffffff',
                  color: isActive ? '#ffffff' : exhausted ? '#7d8b9c' : INK,
                  cursor: canUse ? 'pointer' : 'default',
                }}
              >
                {pu.icon}
                <span
                  className="font-mono"
                  style={{
                    fontSize: 8,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: isActive ? '#ffffff' : exhausted ? '#7d8b9c' : '#55677d',
                  }}
                >
                  {pu.short} ·{charge}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <AnimatePresence>
        {confirming && confirmPowerup && (
          <Modal open onClose={() => setConfirming(null)}>
            <div className="flex flex-col gap-4">
              <MonoLabel size={9}>Power play</MonoLabel>
              <h3
                className="font-display"
                style={{ fontWeight: 800, fontSize: 38, lineHeight: 1, textTransform: 'uppercase' }}
              >
                {confirmPowerup.label}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: '#55677d', margin: 0 }}>
                {confirmPowerup.description}
              </p>
              <div className="grid grid-cols-2 gap-px pt-2" style={{ background: 'rgba(13,27,42,0.12)' }}>
                <Button variant="ghost" flush onClick={() => setConfirming(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  flush
                  onClick={() => {
                    onActivate(confirming)
                    setConfirming(null)
                  }}
                >
                  Use it
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  )
}
