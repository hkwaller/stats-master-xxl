'use client'

import { useState, useEffect, useRef } from 'react'
import { Pause } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button, MonoLabel } from '@/components/design-system'
import { PlayerNameInput } from './PlayerNameInput'

const INK = 'var(--color-ink)'
export const BUZZER_HEIGHT = 84

interface BuzzInButtonProps {
  playerId: string
  buzzedInPlayerId: string // '' if nobody
  penaltySeconds: number
  penaltyEndsAt?: number
  pausedAt?: string
  onCancel: () => void
  onBuzzIn: () => void
  onSubmitAnswer: (answer: string) => void
}

/** Animate only the background; the shared deadline remains the clock. */
function PenaltyFill({
  seconds,
  deadline,
  pausedAt,
}: {
  seconds: number
  deadline?: number
  pausedAt?: string
}) {
  const fillRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const node = fillRef.current
    if (!node || !deadline) return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    let animation: Animation | undefined
    function sync() {
      animation?.cancel()
      const now = pausedAt ? Date.parse(pausedAt) : Date.now()
      const remaining = Math.max(0, Math.min(10000, deadline! - now))
      node!.style.transform = `scaleX(${remaining / 10000})`
      if (!pausedAt && !media.matches && remaining > 0) {
        animation = node!.animate(
          [{ transform: `scaleX(${remaining / 10000})` }, { transform: 'scaleX(0)' }],
          { duration: remaining, easing: 'linear', fill: 'forwards' },
        )
      }
    }
    sync()
    media.addEventListener('change', sync)
    return () => {
      animation?.cancel()
      media.removeEventListener('change', sync)
    }
  }, [deadline, pausedAt])

  return (
    <span
      ref={fillRef}
      aria-hidden="true"
      className="penalty-hatch pointer-events-none absolute inset-0 origin-left bg-ice-2"
      style={{ transform: `scaleX(${Math.min(1, Math.max(0, seconds / 10))})` }}
    />
  )
}

/** A hairline-bounded status plane - locked out, or someone else has the puck. */
function StatusPlane({
  label,
  detail,
  tone,
  fill,
}: {
  label: string
  detail: string
  tone: 'dead' | 'wait'
  fill?: React.ReactNode
}) {
  return (
    <div
      className="on-ice relative isolate overflow-hidden px-5 py-6 text-center"
      style={
        tone === 'dead'
          ? { border: '2.5px dashed var(--color-edge-dead)', boxShadow: 'none' }
          : undefined
      }
    >
      {fill}
      <p
        className="font-display relative m-0"
        style={{
          fontSize: 30,
          lineHeight: 1,
          textTransform: 'uppercase',
          color: tone === 'dead' ? 'var(--color-ink-2)' : INK,
        }}
      >
        {label}
      </p>
      <p className="relative mt-2 mb-0">
        <MonoLabel>{detail}</MonoLabel>
      </p>
    </div>
  )
}

export function BuzzInButton({
  playerId,
  buzzedInPlayerId,
  penaltySeconds,
  penaltyEndsAt,
  pausedAt,
  onBuzzIn,
  onCancel,
  onSubmitAnswer,
}: BuzzInButtonProps) {
  const isLockedOut = penaltySeconds > 0
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
        detail={`Wrong guess - buzz again in ${penaltySeconds}s`}
        tone="dead"
        fill={<PenaltyFill seconds={penaltySeconds} deadline={penaltyEndsAt} pausedAt={pausedAt} />}
      />
    )
  }

  if (someoneElseBuzzed) {
    return (
      <StatusPlane
        label="Someone else buzzed"
        detail="Seasons paused until they respond"
        tone="wait"
      />
    )
  }

  if (isBuzzed) {
    return (
      <div className="on-ice flex flex-col gap-4 p-4" aria-label="Your answer">
        <div
          className="career-possession flex flex-col gap-2 px-4 py-4"
          style={{ background: 'var(--color-cobalt)', color: '#fff', border: `3px solid ${INK}`, borderRadius: 14 }}
        >
          <span className="font-display text-[28px] leading-none uppercase">
            You have the puck
          </span>
          <span className="flex items-center gap-2 text-sm">
            <Pause size={14} strokeWidth={2.4} aria-hidden="true" />
            Seasons paused. Name the player or cancel.
          </span>
        </div>

        <PlayerNameInput
          value={answer}
          setValue={setAnswer}
          onSubmit={onSubmitAnswer}
          placeholder="Player name…"
          autoFocus
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink-2">Not sure? Give up the puck.</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
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
      className="fixed inset-x-0 bottom-0 z-40 px-4 pt-2.5"
      style={{
        background: '#ffffff',
        borderTop: `3px solid ${INK}`,
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <motion.button
        onClick={onBuzzIn}
        whileTap={{ x: 3, y: 3, boxShadow: `1px 1px 0 ${INK}` }}
        transition={{ duration: 0.1 }}
        className="btn-ice font-display mx-auto block w-full max-w-[528px] disabled:opacity-50"
        style={{
          background: 'var(--color-cobalt)',
          border: `3px solid ${INK}`,
          boxShadow: `4px 4px 0 ${INK}`,
          color: '#fff',
          minHeight: BUZZER_HEIGHT - 28,
          lineHeight: '1',
          fontSize: 32,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        Buzz in
      </motion.button>
    </div>
  )
}
