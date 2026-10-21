'use client'

import { useEffect, useState } from 'react'
import { careerPenaltySeconds } from '@/lib/game/room-clock'

const NO_PENALTIES: Record<string, number> = {}

export function useCareerPenalties(deadlines: Record<string, number> = NO_PENALTIES, pausedAt?: string, active = true) {
  const [now, setNow] = useState(() => Date.now())
  const hasPenalties = Object.keys(deadlines).length > 0
  useEffect(() => {
    if (!active || pausedAt || !hasPenalties) return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [active, pausedAt, hasPenalties])
  return careerPenaltySeconds(deadlines, pausedAt ? new Date(pausedAt).getTime() : now)
}
