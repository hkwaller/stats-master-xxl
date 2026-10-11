'use client'

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { ArrowRight, Check, Clock3, X } from 'lucide-react'
import { Button } from '@/components/design-system'
import { PuckMark } from '@/components/arcade/Brand'
import { careerTotals } from '@/lib/game/career-totals'
import type { Question, QuestionResult } from '@/types/game'

export function CareerAnswerPopover({ question, seasons, result, onNext, tv = false }: {
  question: Question
  seasons: Question[]
  result?: QuestionResult['playerAnswers'][string]
  onNext?: () => void
  tv?: boolean
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [dismissed, setDismissed] = useState(false)
  const totals = careerTotals(seasons)
  const stats = [
    ['GP', 'Games played', totals.gamesPlayed], ['G', 'Goals', totals.goals],
    ['A', 'Assists', totals.assists], ['PTS', 'Points', totals.points],
    ['PIM', 'Penalty minutes', totals.penaltyMinutes],
  ] as const
  const outcome = result
    ? result.correct ? 'Top shelf.' : result.answer?.trim() ? 'Off the post.' : 'After the buzzer.'
    : 'Career revealed'
  const resultLabel = result
    ? result.correct ? 'Correct answer' : result.answer?.trim() ? 'Incorrect answer' : 'No answer'
    : 'The player behind the numbers'

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dismissed) return
    dialog.showModal()
    return () => dialog.close()
  }, [dismissed])

  if (dismissed) return null
  return (
    <dialog ref={dialogRef} aria-labelledby={titleId}
      className={`career-answer-dialog ${tv ? 'career-answer-dialog-tv' : ''} ${result?.correct ? 'career-answer-correct' : ''}`}
      onCancel={() => setDismissed(true)}>
      <div className="career-answer-rink" aria-hidden="true" />
      <div className="career-answer-content">
        <div className="career-answer-topline">
          <div className="career-answer-kicker">
            <span className="career-answer-light" aria-hidden="true" />
            Answer revealed
          </div>
          <button type="button" onClick={() => setDismissed(true)} aria-label="Close career answer"
            className="career-answer-close flex h-11 w-11 shrink-0 items-center justify-center text-ink-2 hover:bg-ice-1 focus-visible:outline-2 focus-visible:outline-blue-line">
            <X size={24} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>

        <div className="career-answer-identity">
          <h2 id={titleId} className="career-answer-name font-display m-0 font-extrabold uppercase">
            <span className="career-answer-firstname">{question.firstName}</span>{' '}
            <span className="career-answer-lastname">{question.lastName}</span>
          </h2>
          <p className="career-answer-seasonline">
            <span className="career-answer-tenure">{totals.seasons} NHL seasons</span>
            {seasons.length > 0 ? (
              <span>{seasons[0].season} — {seasons[seasons.length - 1].season}</span>
            ) : null}
          </p>
        </div>

        <section className="career-answer-board" aria-label="Career totals">
          <div className="jumbo-body">
            <div className="jumbo-screen relative overflow-hidden">
              <div className="jumbo-dots pointer-events-none absolute inset-0" aria-hidden="true" />
              <div className="career-answer-board-label relative">
                <span>Career totals</span><span>Regular season</span>
              </div>
              <dl className="career-answer-stats relative m-0">
                {stats.map(([abbr, label, value], index) => (
                  <div key={abbr} className={`career-answer-cell ${abbr === 'PTS' ? 'career-answer-cell-points' : ''}`}
                    style={{ '--reveal-delay': `${260 + index * 90}ms`, '--stat-characters': value.toLocaleString('en-US').length } as CSSProperties}>
                    <dt className="career-answer-stat-label"><span aria-hidden="true">{abbr}</span><span className="sr-only">{label}</span></dt>
                    <dd className="career-answer-stat font-led m-0 font-bold tabular-nums">
                      {value.toLocaleString('en-US')}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <div className="kickplate" aria-hidden="true" />
        </section>

        <div className="career-answer-footer">
          <div role="status" className="career-answer-result">
            <div className="career-answer-puck" aria-hidden="true">
              <PuckMark size={42} />
            </div>
            <div>
              <div className="career-answer-result-label">
                {result ? result.correct ? <Check size={13} aria-hidden="true" /> : <X size={13} aria-hidden="true" /> : null}
                {resultLabel}
              </div>
              <div className="career-answer-outcome font-display font-extrabold uppercase">
                {outcome}
                {result?.points ? <span className="career-answer-earned tabular-nums">{result.points > 0 ? '+' : ''}{result.points} pts</span> : null}
              </div>
            </div>
          </div>
          {onNext ? (
            <Button type="button" onClick={onNext} size={tv ? 'lg' : 'md'} className="career-answer-next">
              Next <ArrowRight size={20} strokeWidth={2.4} aria-hidden="true" />
            </Button>
          ) : <span className="career-answer-waiting"><Clock3 size={15} aria-hidden="true" /> Waiting for the host</span>}
        </div>
      </div>
    </dialog>
  )
}
