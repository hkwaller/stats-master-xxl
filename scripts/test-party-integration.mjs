// Run against `npm run party:dev`.
// `--restore` verifies the large room after restarting the local Worker.
import assert from 'node:assert/strict'
import WebSocket from 'ws'
import { readFileSync } from 'node:fs'
import { createHmac } from 'node:crypto'
const worker = process.env.TEST_PARTY_HOST ?? 'localhost:1999'
const hostId = '11111111-1111-4111-8111-111111111111'
const playerId = '22222222-2222-4222-8222-222222222222'
const sockets = []
// Sign local fixture tickets directly; the HTTP endpoint is covered separately.
const secret =
  process.env.TEST_PARTY_SECRET ??
  readFileSync(new URL('../party/.dev.vars', import.meta.url), 'utf8').match(
    /^PARTY_SECRET=(.+)$/m,
  )?.[1]
assert.ok(secret, 'Set TEST_PARTY_SECRET or create party/.dev.vars')
async function ticket(room, guestId) {
  const body = Buffer.from(
    JSON.stringify({ room, id: guestId, name: 'Guest', exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).toString('base64url')
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`
}
async function connect(room, id, signed) {
  const socket = new WebSocket(
    `ws://${worker}/parties/room/${room}?ticket=${encodeURIComponent(signed ?? (await ticket(room, id)))}`,
  )
  sockets.push(socket)
  const peer = { socket, state: null, online: [], sequence: 0 }
  socket.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    peer.state = m.state
    peer.online = m.online
    peer.sequence++
  })
  await wait(() => peer.state)
  return peer
}
async function wait(predicate) {
  const deadline = Date.now() + 12_000
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('Timed out waiting for room state')
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}
async function send(peer, type, args, envelope = {}) {
  const sequence = peer.sequence
  peer.socket.send(
    JSON.stringify({
      type,
      args,
      round: peer.state.currentQuestionIndex,
      session: peer.state.session,
      ...envelope,
    }),
  )
  await wait(() => peer.sequence > sequence)
}
async function refused(room, signed) {
  const socket = new WebSocket(
    `ws://${worker}/parties/room/${room}?ticket=${encodeURIComponent(signed)}`,
  )
  sockets.push(socket)
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Ticket rejection timed out')), 5000)
    socket.addEventListener('error', () => {
      clearTimeout(timer)
      resolve()
    })
    socket.addEventListener('open', () => {
      clearTimeout(timer)
      reject(new Error('Invalid ticket accepted'))
    })
  })
}
const q = {
  id: 'q1',
  playerId: 8471675,
  firstName: 'Sidney',
  lastName: 'Crosby',
  seasonId: 20242025,
  season: '2024-25',
  era: '2020s',
  positionCode: 'C',
  teamAbbrevs: 'PIT',
  teamNames: 'Pittsburgh Penguins',
  points: 100,
  gamesPlayed: 80,
  goals: 40,
  assists: 60,
  penaltyMinutes: 30,
  difficulty: 'hard',
  choices: ['Sidney Crosby', 'Wayne Gretzky'],
}
try {
  if (process.argv.includes('--restore')) {
    const restored = await connect('SMBIG1', hostId)
    assert.equal(restored.state.gameMode, 'career')
    assert.equal(restored.state.careerData.length, 20)
    assert.ok(JSON.stringify(restored.state).length > 128 * 1024)
    console.log('PASS: large career room restored after Worker restart')
  } else {
    const room = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0')
    const host = await connect(room, hostId)
    const phone = await connect(room, playerId)
    await send(host, 'joinGame', { id: hostId, name: 'Host' })
    await send(phone, 'joinGame', { id: playerId, name: 'Phone' })
    await wait(() => host.state.players.length === 2)
    console.log('Checking forged ticket')
    await refused(room, 'forged.ticket')
    console.log('Checking wrong-room ticket')
    await refused(room, await ticket('OTHER1', hostId))
    await send(phone, 'finishGame', hostId)
    assert.equal(host.state.command, 'idle')
    console.log('PASS: forged/wrong-room tickets and socket identity guards')
    for (const mode of ['classic', 'career', 'h2h', 'higher-lower']) {
      await send(host, 'startGame', {
        requesterId: hostId,
        bossToken: 'token',
        questionSequence: [q],
        gameMode: mode,
        careerData:
          mode === 'career'
            ? [
                {
                  playerId: q.playerId,
                  firstName: 'Sidney',
                  lastName: 'Crosby',
                  totalCareerPoints: 1000,
                  fullCareer: true,
                  seasons: [q],
                },
              ]
            : [],
        h2hPairs:
          mode === 'h2h'
            ? [{ left: q, right: q, targetName: 'Sidney Crosby', correctSide: 'left' }]
            : [],
        hlPairs:
          mode === 'higher-lower'
            ? [
                {
                  reference: q,
                  challenge: q,
                  field: 'points',
                  referenceValue: 90,
                  challengeValue: 100,
                  correctAnswer: 'higher',
                },
              ]
            : [],
      })
      assert.equal(host.state.command, 'starting')
      for (let i = 0; i < 3; i++) await send(host, 'tickCountdown', hostId)
      const nextType = {
        classic: 'nextQuestion',
        career: 'nextCareerRound',
        h2h: 'nextH2HRound',
        'higher-lower': 'nextHLRound',
      }[mode]
      await send(host, nextType, { requesterId: hostId, choices: q.choices })
      assert.equal(host.state.command, 'answering')
      await send(host, 'setGamePaused', { requesterId: hostId, paused: true })
      assert.ok(host.state.pausedAt)
      await send(host, 'setGamePaused', { requesterId: hostId, paused: false })
      await wait(() => phone.state.command === 'answering' && !phone.state.pausedAt)
      if (mode === 'career') await send(phone, 'buzzIn', { playerId })
      await send(phone, mode === 'career' ? 'submitCareerAnswer' : 'submitAnswer', {
        playerId,
        answer: mode === 'h2h' ? 'left' : mode === 'higher-lower' ? 'higher' : 'Crosby',
      })
      if (mode !== 'career')
        await send(
          host,
          { classic: 'revealAnswers', h2h: 'revealH2HAnswers', 'higher-lower': 'revealHLAnswers' }[
            mode
          ],
          hostId,
        )
      await wait(() => host.state.command === 'revealing')
      assert.ok(host.state.players.find((p) => p.id === playerId).score > 0)
      await send(host, 'advanceToNext', hostId)
      assert.equal(host.state.command, 'finished')
      const restored = await connect(room, playerId)
      assert.deepEqual(restored.state, host.state)
      assert.equal(restored.state.players.length, 2)
      restored.socket.close()
      const session = host.state.session
      await send(host, 'rematch', hostId)
      assert.equal(host.state.command, 'rematch')
      assert.notEqual(host.state.session, session)
      await send(host, 'finishGame', hostId, { session })
      assert.equal(host.state.command, 'rematch')
      console.log(`PASS: ${mode} game, score, pause, reconnect, rematch, stale-session rejection`)
    }
    const large = await connect('SMBIG1', hostId)
    if (!['idle', 'rematch'].includes(large.state.command)) await send(large, 'rematch', hostId)
    const career = {
      playerId: q.playerId,
      firstName: 'Sidney',
      lastName: 'Crosby',
      totalCareerPoints: 1000,
      fullCareer: true,
      seasons: Array.from({ length: 40 }, () => q),
    }
    await send(large, 'startGame', {
      requesterId: hostId,
      bossToken: 'token',
      gameMode: 'career',
      questionSequence: Array(20).fill(q),
      careerData: Array(20).fill(career),
    })
    assert.ok(JSON.stringify(large.state).length > 128 * 1024)
    console.log(
      `PASS: career snapshot above storage value limit (${JSON.stringify(large.state).length} characters) saved successfully`,
    )
  }
} finally {
  for (const socket of sockets) socket.close()
}
