import { describe, expect, it } from 'vitest'
import { signRoomTicket, verifyRoomTicket } from './roomTicket'

describe('room tickets', () => {
  it('round-trips the user for the room it was signed for', async () => {
    const t = await signRoomTicket({ room: 'BCDF', id: 'guest_1', name: 'Åse' }, 'secret')
    expect(await verifyRoomTicket(t, 'BCDF', 'secret')).toEqual({ id: 'guest_1', name: 'Åse' })
  })

  it('rejects another room, another secret, a tampered body and an expired ticket', async () => {
    const t = await signRoomTicket({ room: 'BCDF', id: 'guest_1', name: 'A' }, 'secret', 60, 0)
    const fresh = await signRoomTicket({ room: 'BCDF', id: 'guest_1', name: 'A' }, 'secret')
    expect(await verifyRoomTicket(fresh, 'GHJK', 'secret')).toBeNull()
    expect(await verifyRoomTicket(fresh, 'BCDF', 'other')).toBeNull()
    const [, sig] = fresh.split('.')
    const forged = btoa(
      JSON.stringify({ room: 'BCDF', id: 'someone_else', name: 'A', exp: 9e9 }),
    ).replace(/=+$/, '')
    expect(await verifyRoomTicket(`${forged}.${sig}`, 'BCDF', 'secret')).toBeNull()
    expect(await verifyRoomTicket(t, 'BCDF', 'secret', 61_000)).toBeNull()
    expect(await verifyRoomTicket('garbage', 'BCDF', 'secret')).toBeNull()
  })
})
