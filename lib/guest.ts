import { v4 as uuid } from 'uuid'

const GUEST_KEY = 'nhl-stats-master:guest'

export type Guest = {
  id: string
  name: string
}

const ADJECTIVES = ['Icy', 'Slapshot', 'Frosty', 'Power', 'Lightning', 'Blazing', 'Iron', 'Mighty']
const NOUNS = ['Puck', 'Blade', 'Stick', 'Wrist', 'Glove', 'Cage', 'Rink', 'Crease']

export function generateGuestName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const num = Math.floor(Math.random() * 9000) + 1000
  return `${adj}${noun}${num}`
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

  const guest: Guest = { id: uuid(), name: generateGuestName() }
  localStorage.setItem(GUEST_KEY, JSON.stringify(guest))
  return guest
}

export function updateGuestName(name: string): void {
  if (typeof window === 'undefined') return
  const guest = getOrCreateGuest()
  localStorage.setItem(GUEST_KEY, JSON.stringify({ ...guest, name }))
}
