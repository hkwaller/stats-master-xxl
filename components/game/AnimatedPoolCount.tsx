'use client'

import { useEffect, useRef } from 'react'
import { animate } from 'framer-motion'

const numberFormat = new Intl.NumberFormat('en-US')

/** Animate presentation only; the accessible count and game eligibility update immediately. */
export function AnimatedPoolCount({ count }: { count: number | null }) {
  const element = useRef<HTMLSpanElement>(null)
  const displayed = useRef(0)
  // Keep this text child stable so React does not overwrite the animated DOM text
  // with a placeholder while a server-backed mode recalculates its pool.
  const initialText = useRef(count === null ? '-' : numberFormat.format(count))

  useEffect(() => {
    const node = element.current
    if (!node || count === null) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let animation: ReturnType<typeof animate> | undefined
    const paint = (value: number) => {
      displayed.current = value
      node.textContent = numberFormat.format(Math.round(value))
    }
    const update = () => {
      animation?.stop()
      if (preference.matches) {
        paint(count)
        return
      }
      paint(displayed.current)
      animation = animate(displayed.current, count, {
        duration: 0.65,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: paint,
        onComplete: () => paint(count),
      })
    }
    update()
    preference.addEventListener('change', update)
    return () => {
      animation?.stop()
      preference.removeEventListener('change', update)
    }
  }, [count])

  return (
    <>
      <span ref={element} aria-hidden="true" className="setup-pool-number font-led tabular-nums">
        {initialText.current}
      </span>
      <span className="sr-only">{count === null ? 'Count pending' : numberFormat.format(count)}</span>
    </>
  )
}
