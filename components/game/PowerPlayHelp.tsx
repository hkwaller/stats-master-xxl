'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Info } from 'lucide-react'
import { POWERUP_DETAILS } from '@/lib/game/powerups'

/** Noninteractive help: hover, keyboard focus, or tap; Escape/outside tap dismisses it. */
export function PowerPlayHelp() {
  const [open, setOpen] = useState(false)
  const id = useId()
  const root = useRef<HTMLSpanElement>(null)
  const pinned = useRef(false)

  function close() {
    pinned.current = false
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    function dismissOutside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) close()
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', dismissOutside)
    document.addEventListener('keydown', dismissOnEscape)
    return () => {
      document.removeEventListener('pointerdown', dismissOutside)
      document.removeEventListener('keydown', dismissOnEscape)
    }
  }, [open])

  return (
    <span
      ref={root}
      className="power-play-help"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={close}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close()
      }}
    >
      <button
        type="button"
        className="power-play-help-trigger"
        aria-label="About Power Plays"
        aria-expanded={open}
        aria-controls={id}
        aria-describedby={open ? id : undefined}
        onFocus={(event) => {
          if (event.currentTarget.matches(':focus-visible')) setOpen(true)
        }}
        onClick={() => {
          pinned.current = !pinned.current
          setOpen(pinned.current)
        }}
      >
        <Info size={18} strokeWidth={2} aria-hidden="true" />
      </button>
      {open && (
        <span id={id} role="tooltip" className="power-play-help-panel">
          <span className="power-play-help-heading">Power Plays</span>
          <span className="power-play-help-intro">Classic only. One use of each per player, per game.</span>
          {Object.entries(POWERUP_DETAILS).map(([type, detail]) => (
            <span key={type} className="power-play-help-item">
              <strong>{detail.label}</strong>
              <span>{detail.description}</span>
              {detail.requirement && <span className="power-play-help-requirement">{detail.requirement}</span>}
            </span>
          ))}
        </span>
      )}
    </span>
  )
}
