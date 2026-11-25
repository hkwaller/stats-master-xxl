'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Scissors, Snowflake, Zap } from 'lucide-react'
import type { AnswerMode, PowerupType, RevealMode } from '@/types/game'
import { Button, Modal, MonoLabel } from '@/components/design-system'
import { PowerPlayHelp } from '@/components/game/PowerPlayHelp'
import { POWERUP_DETAILS } from '@/lib/game/powerups'

const INK = '#14213d'

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
    label: POWERUP_DETAILS.eliminate.label,
    description: POWERUP_DETAILS.eliminate.description,
    icon: <Scissors size={18} strokeWidth={2} />,
    availableIn: (mode) => mode === 'multiplechoice',
  },
  {
    type: 'doubledown',
    short: 'Double',
    label: 'Double Down',
    description: POWERUP_DETAILS.doubledown.description,
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
    description: POWERUP_DETAILS.freeze.description,
    icon: <Snowflake size={18} strokeWidth={2} />,
    availableIn: (_, revealMode) => revealMode === 'timed',
  },
  {
    type: 'extrahint',
    short: 'Rush',
    label: 'Rush',
    description: POWERUP_DETAILS.extrahint.description,
    icon: <Zap size={18} strokeWidth={2} />,
    availableIn: (_, revealMode) => revealMode === 'timed',
  },
]

/**
 * Fixed to the bottom of the phone on white. A 4-column grid whose 1px gaps
 * show the navy backing through as dividers. Cells are 72px tall - comfortably
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
      <div style={{ background: '#ffffff', borderTop: `3px solid ${INK}`, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-between px-4 pt-1.5">
          <div className="flex items-center gap-1">
            <MonoLabel>Power plays</MonoLabel>
            <PowerPlayHelp />
          </div>
          {status && (
            <MonoLabel color={INK}>
              {status}
            </MonoLabel>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 px-3 pb-3">
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
                title={`${pu.label}: ${pu.description}${POWERUP_DETAILS[pu.type].requirement ? ` ${POWERUP_DETAILS[pu.type].requirement}` : ''}`}
                aria-label={`${pu.label}: ${pu.description} ${charge} ${charge === 1 ? 'use' : 'uses'} remaining.${available ? '' : ` ${POWERUP_DETAILS[pu.type].requirement}`}`}
                disabled={!canUse}
                onClick={() => canUse && setConfirming(pu.type)}
                aria-pressed={isActive}
                className="flex flex-col items-center justify-center gap-1"
                style={{
                  height: 64,
                  borderRadius: 14,
                  border: exhausted ? '2.5px dashed var(--color-edge-dead)' : `2.5px solid ${INK}`,
                  background: isActive ? 'var(--color-lemon)' : exhausted ? 'transparent' : '#ffffff',
                  boxShadow: canUse ? `3px 3px 0 ${INK}` : 'none',
                  color: exhausted ? 'var(--color-ink-3)' : INK,
                  cursor: canUse ? 'pointer' : 'default',
                }}
              >
                {pu.icon}
                <span
                  className="font-mono"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: exhausted ? 'var(--color-ink-3)' : INK,
                  }}
                >
                  {pu.short} · {isActive ? 'ON' : charge}
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
              <MonoLabel>Power play</MonoLabel>
              <h3
                className="font-display m-0"
                style={{ fontSize: 40, lineHeight: 1, textTransform: 'uppercase' }}
              >
                {confirmPowerup.label}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: '#4a5a78', margin: 0 }}>
                {confirmPowerup.description}
              </p>
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <Button variant="ghost" onClick={() => setConfirming(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
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
