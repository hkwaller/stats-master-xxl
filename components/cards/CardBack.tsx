import type { Question } from '@/types/game'

const INK = 'var(--color-ink)'

const STATS: { key: keyof Question; abbr: string; key_stat?: boolean }[] = [
  { key: 'gamesPlayed', abbr: 'GP' },
  { key: 'goals', abbr: 'G' },
  { key: 'assists', abbr: 'A' },
  { key: 'points', abbr: 'PTS', key_stat: true },
  { key: 'penaltyMinutes', abbr: 'PIM' },
]

function shortSeason(season: string) {
  // "1988-89" → "88–89"; anything else passes through.
  const m = season.match(/^\d{2}(\d{2})-(\d{2})$/)
  return m ? `${m[1]}–${m[2]}` : season
}

/**
 * The back of the trading card: one season line in Space Mono, PTS in lemon.
 * Stats light up left to right as `revealedColumns` grows (0–5); the team stays
 * face down until it is hinted or the card is revealed.
 */
export function CardBack({
  question,
  revealedColumns = 5,
  showTeam = false,
  title = 'Card back · Regular season',
  size = 'tv',
}: {
  question: Question
  revealedColumns?: number
  showTeam?: boolean
  title?: string
  size?: 'tv' | 'phone'
}) {
  const tv = size === 'tv'
  const value = tv ? 30 : 23
  const head = tv ? 13 : 11
  const columns = tv
    ? '1.5fr 1fr repeat(3, minmax(0, 1fr)) 1.15fr minmax(0, 1fr)'
    : 'repeat(5, minmax(0, 1fr))'

  const cell = (content: React.ReactNode, opts: { lemon?: boolean; dim?: boolean; index?: number } = {}) => (
    <span
      className={opts.index !== undefined ? 'led-cell-in tabular-nums' : 'tabular-nums'}
      style={{
        padding: tv ? '4px 14px 12px' : '2px 0 8px',
        fontSize: value,
        fontWeight: 700,
        lineHeight: 1.15,
        background: opts.lemon ? 'var(--color-lemon)' : undefined,
        color: opts.dim ? 'var(--color-ink-3)' : INK,
        borderTop: tv ? '2px solid var(--color-ice-2)' : undefined,
        animationDelay: opts.index !== undefined ? `${opts.index * 60}ms` : undefined,
      }}
    >
      {content}
    </span>
  )

  return (
    <div
      className="overflow-hidden"
      style={{
        background: '#ffffff',
        border: `3px solid ${INK}`,
        borderRadius: 14,
        boxShadow: tv ? 'none' : `4px 4px 0 ${INK}`,
      }}
    >
      <div
        className="font-mono"
        style={{
          background: tv ? INK : 'var(--color-cobalt)',
          color: '#ffffff',
          padding: tv ? '6px 14px' : '6px 12px',
          fontSize: tv ? 13 : 12,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </div>
      <div
        className="font-mono grid"
        style={{ gridTemplateColumns: columns, textAlign: tv ? 'left' : 'center' }}
      >
        {tv && <Head size={head}>Season</Head>}
        {tv && <Head size={head}>Team</Head>}
        {STATS.map((s) => (
          <Head key={s.abbr} size={head} lemon={s.key_stat} center={!tv}>
            {s.abbr}
          </Head>
        ))}
        {tv && cell(shortSeason(question.season))}
        {tv && cell(showTeam ? question.teamAbbrevs : '???', { dim: !showTeam })}
        {STATS.map((s, i) => {
          const lit = i < revealedColumns
          return (
            <span key={s.abbr} style={{ display: 'contents' }}>
              {cell(lit ? String(question[s.key]) : '–', {
                lemon: s.key_stat,
                dim: !lit,
                index: lit ? i : undefined,
              })}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function Head({
  children,
  size,
  lemon,
  center,
}: {
  children: React.ReactNode
  size: number
  lemon?: boolean
  center?: boolean
}) {
  return (
    <span
      style={{
        padding: center ? '6px 0 0' : '8px 14px 4px',
        fontSize: size,
        fontWeight: 700,
        color: lemon ? INK : 'var(--color-ink-2)',
        background: lemon ? 'var(--color-lemon)' : undefined,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  )
}
