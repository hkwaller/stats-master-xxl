import type { Question } from '@/types/game'

const STATS: { key: keyof Question; abbr: string; label: string }[] = [
  { key: 'gamesPlayed', abbr: 'GP', label: 'Games played' },
  { key: 'goals', abbr: 'G', label: 'Goals' },
  { key: 'assists', abbr: 'A', label: 'Assists' },
  { key: 'points', abbr: 'PTS', label: 'Points' },
  { key: 'penaltyMinutes', abbr: 'PIM', label: 'Penalty minutes' },
]

/** Stats light up from left to right as the round progresses. */
export function CardBack({
  question,
  revealedColumns = 5,
  title = 'Card back · Regular season',
  size = 'tv',
}: {
  question: Question
  revealedColumns?: number
  title?: string
  size?: 'tv' | 'phone'
}) {
  const tv = size === 'tv'

  return (
    <div className="on-ice overflow-hidden">
      {!tv && (
        <div className="bg-cobalt px-3 py-1.5 font-mono text-xs font-bold tracking-[0.06em] text-white uppercase">
          {title}
        </div>
      )}
      <dl className={`m-0 grid grid-cols-5 text-center ${tv ? 'gap-1.5 p-2' : ''}`}>
        {STATS.map(({ key, abbr, label }, index) => {
          const lit = index < revealedColumns
          const points = key === 'points'
          return (
            <div
              key={key}
              className={`min-w-0 ${tv ? 'rounded-lg py-2' : 'pt-1.5 pb-2'} ${points ? 'bg-lemon' : ''}`}
            >
              <dt className={`font-mono font-bold ${tv ? 'text-[13px]' : 'text-[11px]'} ${points ? 'text-ink' : 'text-ink-2'}`}>
                <span aria-hidden="true">{abbr}</span>
                <span className="sr-only">{label}</span>
              </dt>
              <dd
                className={`m-0 leading-[1.15] tabular-nums ${tv ? 'font-display text-[clamp(26px,2.8vw,42px)]' : 'font-mono text-[23px] font-bold'} ${lit ? 'stat-light-in text-ink' : 'text-ink-3'}`}
                style={lit ? { animationDelay: `${index * 60}ms` } : undefined}
              >
                {lit ? String(question[key]) : '–'}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
