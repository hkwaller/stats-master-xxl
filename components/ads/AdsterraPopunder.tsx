'use client'

import { useEffect, useRef } from 'react'

import { useAdFree } from '@/hooks/useAdFree'

const POPUNDER_SRC = process.env.NEXT_PUBLIC_ADSTERRA_POPUNDER_SRC

interface AdsterraPopunderProps {
  /**
   * Force-suppress regardless of the local user (e.g. host's Pro perk covering
   * the room). Pass `useInGameAdsSuppressed().suppressed` on in-game screens.
   */
  suppressed?: boolean
}

/**
 * Adsterra popunder, fired once on mount. Self-gating: never injected for
 * ad-free / suppressed users (or before Clerk hydrates). Mount this only where a
 * popunder is acceptable - e.g. the end-of-game screen on player devices (not
 * the shared host display, and never mid-question).
 */
export function AdsterraPopunder({ suppressed = false }: AdsterraPopunderProps) {
  const { adFree, loading } = useAdFree()
  const fired = useRef(false)

  useEffect(() => {
    if (suppressed || adFree || loading || fired.current || !POPUNDER_SRC) return
    fired.current = true

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = POPUNDER_SRC
    document.body.appendChild(script)
  }, [suppressed, adFree, loading])

  return null
}
