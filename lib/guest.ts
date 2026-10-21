import { v4 as uuid } from 'uuid'

const GUEST_KEY = 'nhl-stats-master:guest'

export type Guest = {
  id: string
  name: string
}

export function getGuestId(): string {
  if (typeof window === 'undefined') return ''
  const stored = localStorage.getItem(GUEST_KEY)
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

  const stored = localStorage.getItem(GUEST_KEY)
  if (stored) {
    try {
      return JSON.parse(stored) as Guest
    } catch {
      // fall through to create new
    }
  }

  const guest: Guest = { id: uuid(), name: '' }
  localStorage.setItem(GUEST_KEY, JSON.stringify(guest))
  return guest
}

export function updateGuestName(name: string): void {
  if (typeof window === 'undefined') return
  const guest = getOrCreateGuest()
  localStorage.setItem(GUEST_KEY, JSON.stringify({ ...guest, name }))
}
