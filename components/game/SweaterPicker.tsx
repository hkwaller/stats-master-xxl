'use client'

import { Check, Minus, Plus } from 'lucide-react'
import type { Jersey as JerseyData } from '@/types/game'
import { JERSEY_BODIES, JERSEY_PATTERNS, JERSEY_TRIMS, nextFreeNumber } from '@/lib/jersey'
import { MonoLabel } from '@/components/design-system'
import { Jersey } from './Jersey'

const INK = 'var(--color-ink)'

/**
 * Pick a pattern, body colour, trim colour and number. Numbers other players
 * wear are skipped by the stepper; the trim can't match the body.
 */
export function SweaterPicker({
  jersey,
  onChange,
  taken,
  takenBy,
}: {
  jersey: JerseyData
  onChange: (next: JerseyData) => void
  taken: ReadonlySet<number>
  /** "4 Sara · 9 Mia" - shown under the number so players know what's gone. */
  takenBy?: string
}) {
  const set = (patch: Partial<JerseyData>) => onChange({ ...jersey, ...patch })

  function pickBody(hex: string) {
    // Keep the pattern visible: a body that matches the trim swaps the trim out.
    if (hex === jersey.trim) set({ body: hex, trim: hex === '#FFFFFF' ? '#14213D' : '#FFFFFF' })
    else set({ body: hex })
  }

  function step(direction: 1 | -1) {
    const start = jersey.number + direction
    const wrapped = start > 99 ? 1 : start < 1 ? 99 : start
    set({ number: nextFreeNumber(wrapped, taken, direction) })
  }

  const bodyLabel = JERSEY_BODIES.find((c) => c.hex === jersey.body)?.label ?? ''
  const trimLabel = JERSEY_TRIMS.find((c) => c.hex === jersey.trim)?.label ?? ''
  const patternLabel = JERSEY_PATTERNS.find((p) => p.id === jersey.pattern)?.label ?? ''

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0">
          <MonoLabel>Pattern · {patternLabel}</MonoLabel>
        </legend>
        <div className="grid grid-cols-6 gap-1.5">
          {JERSEY_PATTERNS.map((p) => {
            const selected = p.id === jersey.pattern
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={selected}
                aria-label={p.label}
                onClick={() => set({ pattern: p.id })}
                className="flex min-h-[54px] items-center justify-center"
                style={{
                  background: '#ffffff',
                  borderRadius: 12,
                  border: selected ? '3px solid var(--color-cobalt)' : '2px solid #c9d8ea',
                  boxShadow: selected ? `3px 3px 0 ${INK}` : 'none',
                  cursor: 'pointer',
                }}
              >
                <Jersey jersey={{ ...jersey, pattern: p.id }} size={38} showName={false} decorative />
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0">
          <MonoLabel>Body · {bodyLabel}</MonoLabel>
        </legend>
        <div className="grid grid-cols-4 gap-1.5">
          {JERSEY_BODIES.map((c) => {
            const selected = c.hex === jersey.body
            return (
              <button
                key={c.hex}
                type="button"
                aria-pressed={selected}
                aria-label={`Body ${c.label}`}
                onClick={() => pickBody(c.hex)}
                className="flex h-11 items-center justify-center"
                style={{
                  background: c.hex,
                  borderRadius: 999,
                  border: selected ? `3px solid ${INK}` : '2px solid rgba(20,33,61,0.25)',
                  cursor: 'pointer',
                }}
              >
                {selected && <Check size={18} strokeWidth={3.2} color="#14213D" aria-hidden />}
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0">
          <MonoLabel>Trim · {trimLabel}</MonoLabel>
        </legend>
        <div className="grid grid-cols-4 gap-1.5">
          {JERSEY_TRIMS.map((c) => {
            const selected = c.hex === jersey.trim
            const same = c.hex === jersey.body
            return (
              <button
                key={c.hex}
                type="button"
                aria-pressed={selected}
                aria-label={same ? `Trim ${c.label}, same as body` : `Trim ${c.label}`}
                disabled={same}
                onClick={() => set({ trim: c.hex })}
                className="flex h-11 items-center justify-center"
                style={{
                  background: c.hex,
                  borderRadius: 12,
                  border: same
                    ? '2px dashed var(--color-edge-dead)'
                    : selected
                      ? `3px solid ${INK}`
                      : '2px solid rgba(20,33,61,0.25)',
                  opacity: same ? 0.45 : 1,
                  cursor: same ? 'not-allowed' : 'pointer',
                }}
              >
                {selected && (
                  <Check size={18} strokeWidth={3.2} color={c.dark ? '#FFFFFF' : '#14213D'} aria-hidden />
                )}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <MonoLabel>Number on the back</MonoLabel>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            aria-label="Lower number"
            onClick={() => step(-1)}
            className="btn-ice flex h-12 w-12 shrink-0 items-center justify-center"
            style={{ background: '#ffffff', border: `2.5px solid ${INK}`, color: INK, cursor: 'pointer' }}
          >
            <Minus size={20} strokeWidth={2.6} aria-hidden />
          </button>
          <output
            aria-live="polite"
            className="font-display flex h-[52px] flex-1 items-center justify-center tabular-nums"
            style={{
              background: '#ffffff',
              border: `3px solid ${INK}`,
              borderRadius: 14,
              boxShadow: `3px 3px 0 ${INK}`,
              fontSize: 34,
              color: INK,
            }}
          >
            {jersey.number}
          </output>
          <button
            type="button"
            aria-label="Higher number"
            onClick={() => step(1)}
            className="btn-ice flex h-12 w-12 shrink-0 items-center justify-center"
            style={{ background: '#ffffff', border: `2.5px solid ${INK}`, color: INK, cursor: 'pointer' }}
          >
            <Plus size={20} strokeWidth={2.6} aria-hidden />
          </button>
        </div>
        {takenBy && (
          <span style={{ fontSize: 13, color: 'var(--color-ink-2)' }}>Taken in this room: {takenBy}</span>
        )}
      </div>
    </div>
  )
}
