'use client'

import { useRef, useLayoutEffect, useId, useState } from 'react'
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
  const anchorRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const [placement, setPlacement] = useState({ above: false, maxHeight: 320 })

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

  const isOpen = showSuggestions && suggestions.length > 0 && !disabled
  useLayoutEffect(() => {
    if (!isOpen) return
    function measure() {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (!rect) return
      const viewport = window.visualViewport
      const top = viewport?.offsetTop ?? 0
      const bottom = top + (viewport?.height ?? window.innerHeight)
      const below = Math.max(0, bottom - rect.bottom - 12)
      const above = Math.max(0, rect.top - top - 12)
      const desired = Math.min(320, suggestions.length * 54)
      const openAbove = below < desired && above > below
      const maxHeight = Math.min(320, openAbove ? above : below)
      setPlacement(previous => previous.above === openAbove && previous.maxHeight === maxHeight
        ? previous : { above: openAbove, maxHeight })
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    window.visualViewport?.addEventListener('resize', measure)
    window.visualViewport?.addEventListener('scroll', measure)
    const observer = new ResizeObserver(measure)
    if (anchorRef.current) observer.observe(anchorRef.current)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
      window.visualViewport?.removeEventListener('resize', measure)
      window.visualViewport?.removeEventListener('scroll', measure)
      observer.disconnect()
    }
  }, [isOpen, suggestions.length])

  useLayoutEffect(() => {
    if (isOpen && activeIndex >= 0) {
      listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [isOpen, activeIndex])

  function handleSubmit() {
    if (!value.trim()) return
    onSubmit(value.trim())
  }

  return (
    <div ref={anchorRef} className={`relative min-w-0 ${isOpen ? 'z-50' : ''}`}>
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
          role="combobox"
          aria-label="Player name"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listId : undefined}
          aria-activedescendant={isOpen && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
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
        {isOpen && (
          <motion.div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Player suggestions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="on-ice absolute inset-x-0 z-50 overflow-y-auto overscroll-contain"
            style={{
              top: placement.above ? undefined : 'calc(100% + 4px)',
              bottom: placement.above ? 'calc(100% + 4px)' : undefined,
              maxHeight: placement.maxHeight,
            }}
          >
            {suggestions.map((name, i) => (
              <button
                key={name}
                type="button"
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSuggestionPick(name)}
                className="block min-h-11 w-full px-4 py-3 text-left break-words transition-colors"
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
