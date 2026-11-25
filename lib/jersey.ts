import type { Jersey, JerseyPattern, Player } from '../types/game'

export const JERSEY_PATTERNS: readonly { id: JerseyPattern; label: string }[] = [
  { id: 'plain', label: 'Plain' },
  { id: 'hoops', label: 'Hoops' },
  { id: 'yoke', label: 'Yoke' },
  { id: 'sleeves', label: 'Sleeves' },
  { id: 'sash', label: 'Sash' },
  { id: 'chevron', label: 'Chevron' },
]

/** Body colours. All are light enough to carry the ink number. */
export const JERSEY_BODIES: readonly { hex: string; label: string }[] = [
  { hex: '#FF7A1A', label: 'Tangerine' },
  { hex: '#2BC48A', label: 'Mint' },
  { hex: '#FF6FA8', label: 'Pink' },
  { hex: '#FFD84D', label: 'Lemon' },
  { hex: '#A48BFF', label: 'Violet' },
  { hex: '#5EC8FF', label: 'Sky' },
  { hex: '#FF8E7A', label: 'Coral' },
  { hex: '#B6E43C', label: 'Lime' },
]

/** Trim colours paint the pattern, the collar and the edge of the number. */
export const JERSEY_TRIMS: readonly { hex: string; label: string; dark: boolean }[] = [
  { hex: '#FFFFFF', label: 'White', dark: false },
  { hex: '#14213D', label: 'Ink', dark: true },
  { hex: '#2357FF', label: 'Cobalt', dark: true },
  { hex: '#FFD84D', label: 'Lemon', dark: false },
  { hex: '#FF7A1A', label: 'Tangerine', dark: false },
  { hex: '#2BC48A', label: 'Mint', dark: false },
  { hex: '#FF6FA8', label: 'Pink', dark: false },
  { hex: '#5EC8FF', label: 'Sky', dark: false },
]

export const JERSEY_PATTERN_IDS = JERSEY_PATTERNS.map((p) => p.id) as [
  JerseyPattern,
  ...JerseyPattern[],
]
export const JERSEY_BODY_HEXES = JERSEY_BODIES.map((c) => c.hex) as [string, ...string[]]
export const JERSEY_TRIM_HEXES = JERSEY_TRIMS.map((c) => c.hex) as [string, ...string[]]

export const JERSEY_NUMBER_MIN = 1
export const JERSEY_NUMBER_MAX = 99

function hash(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * The next number from `start` (inclusive) in `direction` that nobody else wears,
 * wrapping 99 → 1. Returns `start` if every number is taken.
 */
export function nextFreeNumber(start: number, taken: ReadonlySet<number>, direction: 1 | -1 = 1) {
  const span = JERSEY_NUMBER_MAX - JERSEY_NUMBER_MIN + 1
  for (let i = 0; i < span; i++) {
    const n =
      ((((start - JERSEY_NUMBER_MIN + i * direction) % span) + span) % span) + JERSEY_NUMBER_MIN
    if (!taken.has(n)) return n
  }
  return start
}

/** A stable starter sweater for a player id, avoiding numbers already in the room. */
export function defaultJersey(seed: string, taken: ReadonlySet<number> = new Set()): Jersey {
  const h = hash(seed)
  const body = JERSEY_BODIES[h % JERSEY_BODIES.length].hex
  const pattern = JERSEY_PATTERNS[(h >>> 4) % JERSEY_PATTERNS.length].id
  const trim = body === '#FFD84D' || body === '#B6E43C' ? '#14213D' : '#FFFFFF'
  const start = ((h >>> 8) % JERSEY_NUMBER_MAX) + JERSEY_NUMBER_MIN
  return { pattern, body, trim, number: nextFreeNumber(start, taken) }
}

export function isValidJersey(j: Jersey): boolean {
  return (
    JERSEY_PATTERN_IDS.includes(j.pattern) &&
    JERSEY_BODY_HEXES.includes(j.body) &&
    JERSEY_TRIM_HEXES.includes(j.trim) &&
    j.body !== j.trim &&
    Number.isInteger(j.number) &&
    j.number >= JERSEY_NUMBER_MIN &&
    j.number <= JERSEY_NUMBER_MAX
  )
}

/** Numbers worn by everyone except `exceptId`. */
export function takenNumbers(players: readonly Player[], exceptId?: string): Set<number> {
  const taken = new Set<number>()
  for (const p of players) if (p.id !== exceptId && p.jersey) taken.add(p.jersey.number)
  return taken
}

/** The sweater to draw for a player; older rooms without one get a stable default. */
export function jerseyFor(player: Pick<Player, 'id' | 'jersey'>): Jersey {
  return player.jersey ?? defaultJersey(player.id)
}
