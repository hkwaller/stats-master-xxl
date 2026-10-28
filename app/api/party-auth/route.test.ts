import { afterEach, expect, it, vi } from 'vitest'
import { POST } from './route'
import { verifyRoomTicket } from '../../../lib/roomTicket'

const guestId = '11111111-1111-4111-8111-111111111111'
const request = (body: unknown) =>
  new Request('http://localhost/api/party-auth', { method: 'POST', body: JSON.stringify(body) })
afterEach(() => vi.unstubAllEnvs())
it('signs the persistent guest UUID for exactly the requested room', async () => {
  vi.stubEnv('PARTY_SECRET', 'test-secret')
  const res = await POST(request({ room: 'ABC_12', guestId }))
  expect(res.status).toBe(200)
  expect(res.headers.get('cache-control')).toBe('no-store')
  const { ticket } = await res.json()
  expect(await verifyRoomTicket(ticket, 'ABC_12', 'test-secret')).toEqual({
    id: guestId,
    name: 'Guest',
  })
  expect(await verifyRoomTicket(ticket, 'OTHER1', 'test-secret')).toBeNull()
})
it('rejects invalid room codes, guest identifiers, and malformed JSON', async () => {
  vi.stubEnv('PARTY_SECRET', 'test-secret')
  for (const body of [
    null,
    {},
    { room: '../room', guestId },
    { room: 'ABC123', guestId: 'host' },
    { room: 'abc123', guestId },
  ]) {
    expect((await POST(request(body))).status).toBe(400)
  }
  expect(
    (await POST(new Request('http://localhost/api/party-auth', { method: 'POST', body: '{' })))
      .status,
  ).toBe(400)
})
it('returns service unavailable when the shared secret is missing', async () => {
  vi.stubEnv('PARTY_SECRET', '')
  expect((await POST(request({ room: 'ABC123', guestId }))).status).toBe(503)
})
