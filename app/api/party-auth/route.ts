import { signRoomTicket } from '@/lib/roomTicket'

/** Rooms use the same persistent guest UUID as every existing game screen. */
export async function POST(req: Request) {
  const secret = process.env.PARTY_SECRET
  if (!secret) return new Response('Room service is not configured', { status: 503 })
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response('Bad request', { status: 400 })
  }
  if (!body || typeof body !== 'object') return new Response('Bad request', { status: 400 })
  const { room, guestId } = body as Record<string, unknown>
  if (
    typeof room !== 'string' ||
    !/^[A-Z0-9_-]{6}$/.test(room) ||
    typeof guestId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(guestId)
  ) {
    return new Response('Bad room or guest', { status: 400 })
  }
  return Response.json(
    { ticket: await signRoomTicket({ room, id: guestId, name: 'Guest' }, secret) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
