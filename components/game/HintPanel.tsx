'use client'

import type { Question, HintType } from '@/types/game'
import { MonoLabel } from '@/components/design-system'

const INK = '#0d1b2a'

interface HintPanelProps {
  question: Question
  usedHints: HintType[]
  hintsEnabled: boolean
  onRequestHint: (type: HintType) => void
}

const HINTS: { type: HintType; label: string; getValue: (q: Question) => string }[] = [
  { type: 'era', label: 'Era', getValue: (q) => q.era },
  { type: 'team', label: 'Team', getValue: (q) => q.teamNames },
  { type: 'position', label: 'Position', getValue: (q) => positionLabel(q.positionCode) },
]

function positionLabel(code: string): string {
  const map: Record<string, string> = {
    C: 'Center',
    LW: 'Left Wing',
    RW: 'Right Wing',
    D: 'Defenseman',
    G: 'Goalie',
  }
  return map[code] ?? code
}

/**
 * Key/value rows, hairline-divided. A locked row reads LOCKED in dead ink and
 * is the button; once revealed it becomes plain text. Hints are shared, so a
 * reveal lands for the whole room.
 */
export function HintPanel({ question, usedHints, hintsEnabled, onRequestHint }: HintPanelProps) {
  if (!hintsEnabled) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <MonoLabel size={9}>Hints</MonoLabel>
        <MonoLabel size={9} tracking="0.14em">
          {usedHints.length} of {HINTS.length} revealed · shared
        </MonoLabel>
      </div>

      {HINTS.map((hint) => {
        const revealed = usedHints.includes(hint.type)

        return (
          <div
            key={hint.type}
            className="flex items-baseline justify-between gap-3 pb-2.5"
            style={{ borderBottom: '1px solid rgba(13,27,42,0.07)' }}
          >
            <MonoLabel size={9} tracking="0.2em">{hint.label}</MonoLabel>
            {revealed ? (
              <span
                className="font-display truncate"
                style={{ fontWeight: 700, fontSize: 21, color: INK }}
              >
                {hint.getValue(question)}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onRequestHint(hint.type)}
                className="btn-ice font-display"
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  fontWeight: 700,
                  fontSize: 21,
                  color: '#6b7a8c',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textUnderlineOffset: 4,
                  textDecorationColor: 'rgba(13,27,42,0.2)',
                }}
              >
                LOCKED
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
