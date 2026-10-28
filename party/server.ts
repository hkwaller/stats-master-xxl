import {
  routePartykitRequest,
  Server,
  type Connection,
  type ConnectionContext,
  type WSMessage,
} from 'partyserver'
import { createInitialGameState } from '../lib/party/initial'
import { applyRoomAction } from '../lib/party/reducer'
import { parseRoomAction, type RoomMessage } from '../lib/party/protocol'
import { verifyRoomTicket } from '../lib/roomTicket'
import type { GameState } from '../types/game'

type Env = { Room: DurableObjectNamespace<Room>; PARTY_SECRET: string }
type Who = { id: string; name: string }
const IDLE_MS = 24 * 60 * 60 * 1000

export class Room extends Server<Env> {
  static options = { hibernate: true }
  game: GameState | null = null

  async onStart() {
    const count = await this.ctx.storage.get<number>('chunks')
    if (!count) return
    const keys = Array.from({ length: count }, (_, i) => `state:${i}`)
    const values = await this.ctx.storage.get<string>(keys)
    this.game = JSON.parse(keys.map((key) => values.get(key) ?? '').join('')) as GameState
  }

  async onConnect(conn: Connection<Who>, context: ConnectionContext) {
    const ticket = new URL(context.request.url).searchParams.get('ticket') ?? ''
    const who = this.env.PARTY_SECRET
      ? await verifyRoomTicket(ticket, this.name, this.env.PARTY_SECRET)
      : null
    if (!who) return conn.close(4001, 'Unauthorized')
    conn.setState(who)
    if (!this.game) {
      this.game = createInitialGameState(this.name, who.id, crypto.randomUUID())
      await this.save()
    }
    this.push()
  }

  onClose(conn: Connection<Who>) {
    this.push(conn.id)
  }
  onError(conn: Connection<Who>) {
    this.push(conn.id)
  }

  async onMessage(conn: Connection<Who>, raw: WSMessage) {
    const who = conn.state
    if (!who || !this.game || typeof raw !== 'string' || raw.length > 1_000_000) return
    let input
    try {
      input = JSON.parse(raw)
    } catch {
      return
    }
    const action = parseRoomAction(input)
    if (!action) return
    if (input.round !== this.game.currentQuestionIndex || input.session !== this.game.session) {
      this.push()
      return
    }
    const next = applyRoomAction(this.game, who.id, this.online(), action)
    if (next !== this.game) {
      this.game = next
      await this.save()
    }
    // A no-op also confirms the authoritative snapshot to reconnecting clients.
    this.push()
  }

  async save() {
    // Full NHL careers can exceed the 128 KiB per-value limit. Publish all chunks
    // and their count atomically so a restart never reads half of a snapshot.
    const json = JSON.stringify(this.game)
    const chunks = json.match(/[\s\S]{1,16000}/g) ?? []
    await this.ctx.storage.transaction(async (tx) => {
      const previous = (await tx.get<number>('chunks')) ?? 0
      await tx.put(Object.fromEntries(chunks.map((chunk, i) => [`state:${i}`, chunk])))
      if (previous > chunks.length)
        await tx.delete(
          Array.from({ length: previous - chunks.length }, (_, i) => `state:${i + chunks.length}`),
        )
      await tx.put('chunks', chunks.length)
      await tx.setAlarm(Date.now() + IDLE_MS)
    })
  }

  async onAlarm() {
    for (const c of this.getConnections()) c.close(4000, 'Room expired')
    await this.ctx.storage.deleteAll()
    this.game = null
  }

  online(closing?: string) {
    return new Set(
      [...this.getConnections<Who>()]
        .filter((c) => c.id !== closing && c.state)
        .map((c) => c.state!.id),
    )
  }
  push(closing?: string) {
    if (!this.game) return
    const message: RoomMessage = {
      type: 'state',
      state: this.game,
      online: [...this.online(closing)],
    }
    const without = [...this.getConnections<Who>()]
      .filter((c) => c.id === closing || !c.state)
      .map((c) => c.id)
    this.broadcast(JSON.stringify(message), without)
  }
}

export default {
  async fetch(req, env) {
    return (
      (await routePartykitRequest(req, env, {
        onBeforeConnect: async (request, lobby) => {
          const ticket = new URL(request.url).searchParams.get('ticket') ?? ''
          if (
            !/^[A-Z0-9_-]{6}$/.test(lobby.name) ||
            !env.PARTY_SECRET ||
            !(await verifyRoomTicket(ticket, lobby.name, env.PARTY_SECRET))
          )
            return new Response('Unauthorized', { status: 401 })
        },
        onBeforeRequest: () => new Response('Not found', { status: 404 }),
      })) ?? new Response('Not found', { status: 404 })
    )
  },
} satisfies ExportedHandler<Env>
