'use client'

import type { Question, HintType } from '@/types/game'
import { MonoLabel } from '@/components/design-system'

const INK = '#14213d'

interface HintPanelProps {
  question: Question
  usedHints: HintType[]
  hintsEnabled: boolean
  onRequestHint: (type: HintType) => void
  showEraHint?: boolean
  showSeasonHint?: boolean
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
 * Key/value rows, hairline-divided. Each hidden hint has a Reveal button;
 * once revealed it becomes plain text. Hints are shared, so a
 * reveal lands for the whole room.
 */
export function HintPanel({ question, usedHints, hintsEnabled, onRequestHint, showEraHint = true, showSeasonHint = false }: HintPanelProps) {
  if (!hintsEnabled) return null
  const availableHints = HINTS.filter((hint) => hint.type !== 'era' || showEraHint)
  const revealedCount = availableHints.filter((hint) => usedHints.includes(hint.type)).length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <MonoLabel>Hints · −10 each</MonoLabel>
        <MonoLabel>
          {revealedCount} of {availableHints.length} revealed · shared
        </MonoLabel>
      </div>

      {availableHints.map((hint) => {
        const revealed = usedHints.includes(hint.type)
        const seasonHint = hint.type === 'era' && showSeasonHint
        const label = seasonHint ? 'Season' : hint.label

        return (
          <div
            key={hint.type}
            className="flex items-center justify-between gap-3 pb-2"
            style={{ borderBottom: '2px solid var(--color-ice-2)' }}
          >
            <MonoLabel>{label}</MonoLabel>
            {revealed ? (
              <span
                className="font-display truncate"
                style={{ fontSize: 22, color: INK, textTransform: 'uppercase' }}
              >
                {seasonHint ? question.season.replace('-', '–') : hint.getValue(question)}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onRequestHint(hint.type)}
                aria-label={`Reveal ${label.toLowerCase()} hint for everyone`}
                className="btn-ice font-display min-h-[40px]"
                style={{
                  border: `2.5px solid ${INK}`,
                  background: '#ffffff',
                  padding: '0 14px',
                  fontSize: 17,
                  color: INK,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                Flip it
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
