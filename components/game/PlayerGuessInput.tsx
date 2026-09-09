'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AnswerMode } from '@/types/game'
import { MonoLabel, ProgressTrack } from '@/components/design-system'
import { AnswerRow, type AnswerState } from './AnswerRow'
import { PlayerNameInput } from './PlayerNameInput'

const ANSWER_LETTERS = ['A', 'B', 'C', 'D']

interface PlayerGuessInputProps {
  answerMode: AnswerMode
  choices: string[]
  eliminatedChoices: string[]
  hasAnswered: boolean
  answeredCount: number
  totalPlayers: number
  onSubmit: (answer: string) => void
  /** The choice this player picked, once locked in. */
  selected?: string
  disabled?: boolean
  variant?: 'tv' | 'phone'
}

export function PlayerGuessInput({
  answerMode,
  choices,
  eliminatedChoices,
  hasAnswered,
  answeredCount,
  totalPlayers,
  onSubmit,
  selected,
  disabled = false,
  variant = 'phone',
}: PlayerGuessInputProps) {
  const [freetext, setFreetext] = useState('')
  const locked = hasAnswered || disabled

  if (answerMode === 'multiplechoice') {
    return (
      <div className="flex flex-col gap-2.5">
        {choices.map((choice, i) => {
          const isEliminated = eliminatedChoices.includes(choice)
          const isSelected = selected === choice

          // Once you answer, your pick keeps its red edge and the rest fade.
          let state: AnswerState = 'default'
          if (isEliminated) state = 'eliminated'
          else if (isSelected) state = 'selected'
          else if (hasAnswered) state = 'faded'

          return (
            <AnswerRow
              key={`${choice}-${i}`}
              letter={ANSWER_LETTERS[i] ?? '?'}
              name={choice}
              meta={isEliminated ? 'PENALTY BOX' : undefined}
              state={state}
              variant={variant}
              disabled={locked || isEliminated}
              onClick={() => {
                if (locked || isEliminated) return
                onSubmit(choice)
              }}
            />
          )
        })}

        {hasAnswered && <AnsweredStatus answered={answeredCount} total={totalPlayers} />}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence mode="wait">
        {hasAnswered ? (
          <motion.div key="locked" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AnsweredStatus answered={answeredCount} total={totalPlayers} />
          </motion.div>
        ) : (
          <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <PlayerNameInput
              value={freetext}
              setValue={setFreetext}
              onSubmit={onSubmit}
              disabled={disabled}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AnsweredStatus({ answered, total }: { answered: number; total: number }) {
  return (
    <div className="flex flex-col gap-2 pt-1">
      <div className="flex items-baseline justify-between">
        <MonoLabel size={9}>Answer locked</MonoLabel>
        <MonoLabel size={9} tracking="0.14em">
          {answered} / {total} in
        </MonoLabel>
      </div>
      <ProgressTrack fraction={total > 0 ? answered / total : 0} height={5} />
    </div>
  )
}
