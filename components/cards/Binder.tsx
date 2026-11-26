import type { Player } from '@/types/game'
import { jerseyFor } from '@/lib/jersey'
import { Jersey } from '@/components/game/Jersey'

const INK = 'var(--color-ink)'

export type RoundResult = { points: number; correct: boolean; answered: boolean; doubled?: boolean }

/**
 * The room's standings as a row of player cards, best first. Each card wears
 * the player's jersey. Live, a lemon IN stamp marks who has locked in; after a
 * reveal (`round`), each card shows what that card scored.
 */
export function Binder({
  players,
  answeredIds = [],
  round,
  myId,
  label,
}: {
  players: Player[]
  answeredIds?: string[]
  round?: Record<string, RoundResult>
  myId?: string
  label?: string
}) {
  const sorted = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const leaderId = sorted.length && (sorted[0].score ?? 0) > 0 ? sorted[0].id : ''

  return (
    <section className="flex flex-col gap-2" aria-label="Standings">
      {label && (
        <span className="font-mono" style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em' }}>
          {label}
        </span>
      )}
      <ol
        className="m-0 grid list-none gap-2.5 p-0"
        style={{ gridTemplateColumns: `repeat(${Math.max(4, sorted.length)}, minmax(0, 1fr))` }}
      >
        {sorted.map((p, i) => {
          const result = round?.[p.id]
          const answered = answeredIds.includes(p.id)
          const waiting = !round && !answered
          const leader = p.id === leaderId
          const jersey = jerseyFor(p)
          const verdict = result
            ? result.correct
              ? 'GOAL'
              : result.answered
                ? 'WIDE'
                : 'NO SHOT'
            : null

          return (
            <li
              key={p.id}
              className="relative flex min-w-0 items-center gap-2.5"
              style={{
                background: '#ffffff',
                border: waiting ? '2.5px dashed var(--color-edge-dead)' : `2.5px solid ${INK}`,
                borderRadius: 14,
                padding: '8px 10px',
                boxShadow: leader || p.id === myId ? `4px 4px 0 ${INK}` : 'none',
                outline: leader ? '3px solid var(--color-cobalt)' : undefined,
                outlineOffset: 2,
              }}
            >
              <Jersey jersey={jersey} size={48} decorative />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-ink-2)' }}>
                  #{i + 1} · NO. {jersey.number}
                </span>
                <span className="font-display truncate" style={{ fontSize: 22, lineHeight: 1.05, textTransform: 'uppercase' }}>
                  {p.name}
                </span>
                <span
                  key={result ? `r${result.points}` : `s${p.score}`}
                  className="font-mono score-change tabular-nums"
                  style={{ fontSize: 17, fontWeight: 700 }}
                >
                  {result ? `${result.points > 0 ? '+' : ''}${result.points}` : (p.score ?? 0).toLocaleString('en-US')}
                </span>
              </div>

              {verdict ? (
                <Stamp tone={verdict === 'GOAL' ? 'mint' : 'plain'}>
                  {result?.doubled && verdict === 'GOAL' ? 'GOAL 2×' : verdict}
                </Stamp>
              ) : answered ? (
                <Stamp tone="lemon">IN</Stamp>
              ) : (
                <span
                  className="font-mono absolute"
                  style={{ top: 8, right: 10, fontSize: 12, fontWeight: 700, color: 'var(--color-ink-2)' }}
                  aria-label="Still thinking"
                >
                  …
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function Stamp({ children, tone }: { children: React.ReactNode; tone: 'lemon' | 'mint' | 'plain' }) {
  return (
    <span
      className="font-mono absolute"
      style={{
        top: -10,
        right: 8,
        background: tone === 'lemon' ? 'var(--color-lemon)' : tone === 'mint' ? 'var(--color-mint)' : '#ffffff',
        color: INK,
        border: `1.5px solid ${INK}`,
        borderRadius: 5,
        padding: '1px 6px',
        fontSize: 11,
        fontWeight: 700,
        transform: 'rotate(-6deg)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}
