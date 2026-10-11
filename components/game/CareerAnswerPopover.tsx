'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/design-system'
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
    ['Games', totals.gamesPlayed], ['Goals', totals.goals], ['Assists', totals.assists],
    ['Points', totals.points], ['Penalty minutes', totals.penaltyMinutes],
  ] as const

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dismissed) return
    dialog.showModal()
    return () => dialog.close()
  }, [dismissed])

  if (dismissed) return null
  return (
    <dialog ref={dialogRef} aria-labelledby={titleId}
      className={`career-answer-dialog ${tv ? 'career-answer-dialog-tv' : ''}`}
      onCancel={() => setDismissed(true)}>
      <div className="flex items-start justify-between gap-4">
        <h2 id={titleId} className="career-answer-name font-display m-0 font-extrabold uppercase">
          {question.firstName} {question.lastName}
        </h2>
        <button type="button" onClick={() => setDismissed(true)} aria-label="Close career answer"
          className="career-answer-close flex h-11 w-11 shrink-0 items-center justify-center text-ink-2 hover:bg-ice-1 focus-visible:outline-2 focus-visible:outline-blue-line">
          <X size={24} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
      <p className="mt-3 mb-6 text-base text-ink-2">
        {totals.seasons} NHL seasons · {seasons[0]?.season} to {seasons[seasons.length - 1]?.season}
      </p>
      <h3 className="mb-3 font-body text-base font-semibold">Career totals</h3>
      <dl className="career-answer-stats m-0">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-ink-2">{label}</dt>
            <dd className={`career-answer-stat font-display m-0 mt-2 font-extrabold tabular-nums ${label === 'Points' ? 'text-red' : 'text-ink'}`}>
              {value.toLocaleString('en-US')}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-5">
        <div role="status" className="font-display text-2xl font-bold uppercase">
          {result
            ? `${result.correct ? 'Correct' : result.answer ? 'Missed' : 'No answer'}${result.points ? ` · +${result.points} pts` : ''}`
            : 'Career revealed'}
        </div>
        {onNext ? (
          <Button type="button" onClick={onNext} size={tv ? 'lg' : 'md'}>
            Next <ArrowRight size={20} strokeWidth={2.4} aria-hidden="true" />
          </Button>
        ) : <span className="text-sm text-ink-2">Waiting for the host</span>}
      </div>
    </dialog>
  )
}
