'use client'

import { useEffect, useState } from 'react'
import { checkAvailableCount, loadCareerPool } from '@/app/actions/game-actions'
import { selectCareerCandidates, type CareerEligibility } from '@/lib/game/career-pool'
import type { GameSetupConfig } from '@/types/game'

export function useSetupPool(config: GameSetupConfig) {
  const [careerPool, setCareerPool] = useState<CareerEligibility[] | null>(null)
  const [careerError, setCareerError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [excluded, setExcluded] = useState<number[] | null>(null)
  const [remote, setRemote] = useState<{ key: string; count?: number; error?: boolean } | null>(null)
  const isCareer = config.gameMode === 'career'
  const tiers = [...config.difficultyTiers].sort().join(',')
  const eras = [...config.eras].sort().join(',')
  const rookies = config.gameMode === 'classic' && config.rookiesOnly
  const key = JSON.stringify([config.gameMode, tiers, eras, rookies, attempt])
  const empty = !tiers || !eras

  // Keep the same daily exclusions used by the lobby, including other tabs and UTC rollover.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    function refresh() {
      let ids: unknown = []
      try { ids = JSON.parse(localStorage.getItem(`nhl-career-played-${new Date().toISOString().slice(0, 10)}`) ?? '[]') } catch { /* unavailable or invalid storage */ }
      setExcluded(Array.isArray(ids) ? ids.filter((id): id is number => Number.isSafeInteger(id) && id > 0) : [])
      clearTimeout(timer)
      const now = new Date()
      timer = setTimeout(refresh, Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - now.getTime() + 20)
    }
    refresh()
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    return () => { clearTimeout(timer); window.removeEventListener('storage', refresh); window.removeEventListener('focus', refresh) }
  }, [])

  useEffect(() => {
    if (!isCareer || careerPool !== null) return
    let active = true
    setCareerError(false)
    loadCareerPool().then((pool) => { if (active) setCareerPool(pool) })
      .catch(() => { if (active) setCareerError(true) })
    return () => { active = false }
  }, [isCareer, careerPool, attempt])

  useEffect(() => {
    if (isCareer || empty) return
    let active = true
    checkAvailableCount(tiers.split(',') as GameSetupConfig['difficultyTiers'], eras.split(','), rookies)
      .then((count) => { if (active) setRemote({ key, count }) })
      .catch(() => { if (active) setRemote({ key, error: true }) })
    return () => { active = false }
  }, [isCareer, empty, tiers, eras, rookies, key])

  const count = empty ? 0 : isCareer
    ? careerPool !== null && excluded !== null
      ? selectCareerCandidates(careerPool, { minSeasons: config.careerMinSeasons, eras: config.eras, difficultyTiers: config.difficultyTiers, excludePlayerIds: excluded }).length
      : null
    : remote?.key === key ? remote.count ?? null : null
  const error = !empty && (isCareer ? careerError : remote?.key === key && !!remote.error)
  return { count, error, loading: count === null && !error, retry: () => setAttempt((value) => value + 1) }
}
