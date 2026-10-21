import type { PowerupType } from '@/types/game'

export const POWERUP_DETAILS: Record<PowerupType, {
  label: string
  description: string
  requirement?: string
}> = {
  eliminate: {
    label: 'Cut',
    description: 'Remove two wrong answers for you.',
    requirement: 'Multiple choice only.',
  },
  doubledown: {
    label: 'Double Down',
    description: 'Double your points if correct; lose 50 points if wrong.',
  },
  freeze: {
    label: 'Freeze',
    description: 'Stop further stat columns revealing for everyone. The answer timer keeps running.',
    requirement: 'Column-by-column reveals only.',
  },
  extrahint: {
    label: 'Rush',
    description: 'Reveal the next stat column immediately for everyone.',
    requirement: 'Column-by-column reveals only.',
  },
}
