'use client'

import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlayerSearch } from '@/hooks/usePlayerSearch'

const INK = '#0d1b2a'
const RED = '#cf0a2c'

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: RED, fontWeight: 700 }}>{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}

interface PlayerNameInputProps {
  value: string
  setValue: (v: string) => void
  onSubmit: (answer: string) => void
  disabled?: boolean
  placeholder?: string
  submitLabel?: string
  autoFocus?: boolean
}

/**
 * The freetext guess field: a square white plane with a hairline inset, paired
 * with a red submit. Suggestions drop below as hairline-divided rows.
 */
export function PlayerNameInput({
  value,
  setValue,
  onSubmit,
  disabled = false,
  placeholder = 'Type a player name…',
  submitLabel = 'Submit',
  autoFocus = false,
}: PlayerNameInputProps) {
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
      <div className="flex">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          autoFocus={autoFocus}
          className="min-w-0 flex-1 focus:outline-none disabled:opacity-50"
          style={{
            background: '#ffffff',
            boxShadow: 'inset 0 0 0 2px rgba(13,27,42,0.14)',
            borderRadius: 0,
            border: 'none',
            padding: '15px 16px',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 22,
            lineHeight: 1,
            color: INK,
          }}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="btn-ice font-display shrink-0"
          style={{
            background: RED,
            border: 'none',
            color: '#fff',
            padding: '0 24px',
            fontWeight: 700,
            fontSize: 17,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            opacity: disabled || !value.trim() ? 0.4 : 1,
            cursor: disabled || !value.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {submitLabel}
        </button>
      </div>

      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="on-ice absolute inset-x-0 top-full z-20 mt-1 overflow-hidden"
          >
            {suggestions.map((name, i) => (
              <button
                key={name}
                type="button"
                onMouseDown={() => handleSuggestionPick(name)}
                className="w-full px-4 py-3 text-left transition-colors"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 19,
                  color: INK,
                  background: i === activeIndex ? 'rgba(207,10,44,0.07)' : 'transparent',
                  borderBottom: '1px solid rgba(13,27,42,0.07)',
                  borderLeft: `4px solid ${i === activeIndex ? RED : 'transparent'}`,
                }}
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
