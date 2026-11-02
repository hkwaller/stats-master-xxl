'use client'

import { useEffect, useRef } from 'react'
import { gameCompletion, nativeAdsSupported } from '@/lib/ads/native'

export function useGameCompletion(session: string | undefined, route: string, mode: string, phase: 'active' | 'finished' | 'other') {
  const latest = useRef({ session, phase })
  // Read by the delayed presenter before React effect cleanup can run.
  latest.current = { session, phase }
  useEffect(() => {
    if (session) return () => gameCompletion.abandon(session)
  }, [session])
  useEffect(() => {
    if (!session || !nativeAdsSupported()) return
    const completion = { session, route, mode }
    if (phase === 'active') gameCompletion.observeActive(completion)
    if (phase === 'finished') {
      const cancel = gameCompletion.complete(completion, () => latest.current.session === session && latest.current.phase === 'finished')
      // A rematch/settings/exit tap cancels before an asynchronous route commits.
      document.addEventListener('pointerdown', cancel, { capture: true, once: true })
      document.addEventListener('keydown', cancel, { capture: true, once: true })
      return () => {
        cancel()
        document.removeEventListener('pointerdown', cancel, true)
        document.removeEventListener('keydown', cancel, true)
      }
    }
  }, [session, route, mode, phase])
}
