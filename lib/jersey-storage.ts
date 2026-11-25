import type { Jersey } from '../types/game'
import { isValidJersey } from './jersey'

// Browser-only: the party server imports lib/jersey.ts, which must stay DOM-free.
const STORAGE_KEY = 'statsmaster:jersey'

export function loadSavedJersey(): Jersey | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Jersey
    return isValidJersey(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveJersey(jersey: Jersey) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jersey))
  } catch {
    // Private mode or blocked storage: the sweater just isn't remembered.
  }
}
