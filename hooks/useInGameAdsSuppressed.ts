'use client'

import { useAdFree } from './useAdFree'
import { useStorage } from '@/lib/liveblocks/client'

/**
 * Whether in-game ads should be hidden for THIS device inside a live room.
 *
 * Suppressed when either the local user is ad-free, or the host stamped
 * `hostAdFree` on the room at game start (a host's Pro perk covers everyone).
 *
 * Only call this inside a RoomProvider (game-play / end screens). Menu screens
 * like home/lobby have no host, so use `useAdFree` / the self-gating
 * <AdsterraBanner> directly there.
 */
export function useInGameAdsSuppressed(): { suppressed: boolean; loading: boolean } {
  const { adFree, loading } = useAdFree()
  const hostAdFree = useStorage((root) => root.game?.hostAdFree) ?? false
  return { suppressed: adFree || hostAdFree, loading }
}
