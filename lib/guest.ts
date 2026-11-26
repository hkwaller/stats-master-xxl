import { v4 as uuid } from 'uuid'

const GUEST_KEY = 'nhl-stats-master:guest'

export type Guest = {
  id: string
  name: string
}

export function getGuestId(): string {
  if (typeof window === 'undefined') return ''
  const stored = readGuest()
  if (stored) {
    try {
      return (JSON.parse(stored) as Guest).id
    } catch {
      // fall through to create new
    }
  }
  return ''
}

export function getOrCreateGuest(): Guest {
  if (typeof window === 'undefined') return { id: '', name: '' }

  const stored = readGuest()
  if (stored) {
    try {
      return JSON.parse(stored) as Guest
    } catch {
      // fall through to create new
    }
  }

  const guest: Guest = { id: uuid(), name: '' }
  saveGuest(guest)
  return guest
}

export function updateGuestName(name: string): void {
  if (typeof window === 'undefined') return
  const guest = getOrCreateGuest()
  saveGuest({ ...guest, name })
}

function saveGuest(guest: Guest) {
  const value = JSON.stringify(guest)
  try { localStorage.setItem(GUEST_KEY, value) } catch { /* Storage may be disabled. */ }
}

function readGuest() {
  try { return localStorage.getItem(GUEST_KEY) } catch { return null }
}
