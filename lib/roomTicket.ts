/**
 * Short-lived signed room tickets for the PartyServer backend. /api/party-auth
 * signs one for the persistent browser guest identity, and the Worker (party/server.ts)
 * verifies it before a socket may join. HMAC-SHA256 with
 * PARTY_SECRET, shared by Vercel and the Worker. Web Crypto only: runs in both.
 */
export type RoomTicket = { room: string; id: string; name: string }

const enc = new TextEncoder()

const toB64u = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
const fromB64u = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

const hmacKey = (secret: string) =>
  crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ])

export async function signRoomTicket(
  t: RoomTicket,
  secret: string,
  ttlSeconds = 60 * 60,
  now = Date.now(),
): Promise<string> {
  const body = toB64u(
    enc.encode(JSON.stringify({ ...t, exp: Math.floor(now / 1000) + ttlSeconds })),
  )
  const sig = new Uint8Array(
    await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body)),
  )
  return `${body}.${toB64u(sig)}`
}

/** The ticket's user, or null when it is forged, expired or for another room. */
export async function verifyRoomTicket(
  token: string,
  room: string,
  secret: string,
  now = Date.now(),
): Promise<{ id: string; name: string } | null> {
  const parts = token.split('.')
  const [body, sig] = parts
  if (parts.length !== 2 || !body || !sig || !secret) return null
  try {
    if (
      !(await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64u(sig), enc.encode(body)))
    )
      return null
    const t = JSON.parse(new TextDecoder().decode(fromB64u(body))) as RoomTicket & { exp: number }
    if (
      t.room !== room ||
      typeof t.id !== 'string' ||
      !t.id ||
      typeof t.exp !== 'number' ||
      !Number.isFinite(t.exp) ||
      !(t.exp * 1000 > now)
    )
      return null
    return { id: t.id, name: typeof t.name === 'string' ? t.name : 'Guest' }
  } catch {
    return null
  }
}
