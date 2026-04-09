'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AnswerMode } from '@/types/game'
import { Button } from '@/components/design-system'
import { usePlayerSearch } from '@/hooks/usePlayerSearch'

interface PlayerGuessInputProps {
  answerMode: AnswerMode
  choices: string[] // 4 player names (multiple choice)
  eliminatedChoices: string[] // names removed by Eliminate powerup
  hasAnswered: boolean
  answeredCount: number
  totalPlayers: number
  onSubmit: (answer: string) => void
  disabled?: boolean
}

// ─── Multiple Choice ─────────────────────────────────────────────────────────

const buttonColors = [
  'bg-ice-blue/20 border-ice-blue/40 hover:bg-ice-blue/30',
  'bg-game-gold/20 border-game-gold/40 hover:bg-game-gold/30',
  'bg-magenta/15 border-magenta/35 hover:bg-magenta/25',
  'bg-white-ice/10 border-white-ice/20 hover:bg-white-ice/20',
]

function MultipleChoiceInput({
  choices,
  eliminatedChoices,
  hasAnswered,
  onSubmit,
}: {
  choices: string[]
  eliminatedChoices: string[]
  hasAnswered: boolean
  onSubmit: (answer: string) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)

  function handleSelect(choice: string) {
    if (hasAnswered || eliminatedChoices.includes(choice)) return
    setSelected(choice)
    onSubmit(choice)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {choices.map((choice, i) => {
        const isEliminated = eliminatedChoices.includes(choice)
        const isSelected = selected === choice

        return (
          <motion.button
            key={choice}
            onClick={() => handleSelect(choice)}
            disabled={hasAnswered || isEliminated}
            whileTap={!hasAnswered && !isEliminated ? { scale: 0.97 } : undefined}
            whileHover={!hasAnswered && !isEliminated ? { scale: 1.02 } : undefined}
            className={`
              relative px-4 py-4 rounded-xl border text-left font-bold text-base
              transition-all duration-150 cursor-pointer
              ${isEliminated ? 'opacity-30 line-through cursor-not-allowed bg-transparent border-game-card-border' : buttonColors[i % 4]}
              ${isSelected ? 'ring-2 ring-game-gold' : ''}
              ${hasAnswered && !isSelected ? 'opacity-60' : ''}
            `}
          >
            <span className="text-game-text-muted text-xs font-bold mr-2">
              {String.fromCharCode(65 + i)}
            </span>
            {choice}
            {isEliminated && (
              <span className="absolute top-2 right-3 text-game-red text-xs">✕</span>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}

// ─── Highlight matched portion of a suggestion ────────────────────────────────

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-ice-blue font-bold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}

// ─── Free Text ────────────────────────────────────────────────────────────────

function FreeTextInput({
  hasAnswered,
  onSubmit,
}: {
  hasAnswered: boolean
  onSubmit: (answer: string) => void
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    suggestions,
    showSuggestions,
    activeIndex,
    handleChange,
    handleKeyDown,
    handleSuggestionPick,
    handleFocus,
    handleBlur,
  } = usePlayerSearch({ value, setValue, onSubmit })

  function handleSubmit() {
    if (!value.trim()) return
    onSubmit(value.trim())
  }

  return (
    <div className="relative">
      <div className="flex gap-3">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={hasAnswered}
          placeholder="Type a player name…"
          autoComplete="off"
          className="
            flex-1 bg-game-card-dark border border-game-card-border rounded-xl
            px-4 py-3 text-game-text placeholder-game-text-muted
            focus:outline-none focus:border-ice-blue transition-colors
            disabled:opacity-50
          "
        />
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={hasAnswered || !value.trim()}
          size="md"
        >
          Submit
        </Button>
      </div>

      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && !hasAnswered && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 right-0 mt-2 z-20 bg-game-card border border-game-card-border rounded-xl overflow-hidden shadow-xl"
          >
            {suggestions.map((name, i) => (
              <button
                key={name}
                onMouseDown={() => handleSuggestionPick(name)}
                className={`
                  w-full text-left px-4 py-2.5 text-sm transition-colors
                  ${
                    i === activeIndex
                      ? 'bg-ice-blue/20 text-game-text'
                      : 'hover:bg-game-card-dark text-game-text'
                  }
                `}
              >
                <HighlightMatch text={name} query={value} />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PlayerGuessInput({
  answerMode,
  choices,
  eliminatedChoices,
  hasAnswered,
  answeredCount,
  totalPlayers,
  onSubmit,
  disabled = false,
}: PlayerGuessInputProps) {
  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {hasAnswered ? (
          <motion.div
            key="answered"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-6 gap-3"
          >
            <div className="text-4xl">🏒</div>
            <p className="text-game-text-muted text-sm tracking-wide uppercase">
              Answer submitted — waiting for others
            </p>
            <div className="flex items-center gap-2">
              <div className="h-1.5 bg-game-card-dark rounded-full w-32 overflow-hidden">
                <motion.div
                  className="h-full bg-ice-blue rounded-full"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(answeredCount / totalPlayers) * 100}%`,
                  }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <span className="text-sm text-game-text-muted tabular-nums">
                {answeredCount}/{totalPlayers}
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {answerMode === 'multiplechoice' ? (
              <MultipleChoiceInput
                choices={choices}
                eliminatedChoices={eliminatedChoices}
                hasAnswered={hasAnswered || disabled}
                onSubmit={onSubmit}
              />
            ) : (
              <FreeTextInput hasAnswered={hasAnswered || disabled} onSubmit={onSubmit} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
