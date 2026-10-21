const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { LiveList, LiveObject } = require('@liveblocks/client')

function load(file, resolve) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', source)(resolve, module, module.exports)
  return module.exports
}
const types = load('types/game.ts', require)

function room() {
  return new LiveObject({
    hostId: 'host', bossId: 'boss', hostPlays: false, command: 'finished',
    gameMode: 'classic', questionCount: 10,
    players: new LiveList([
      { id: 'boss', name: 'Boss', score: 100, isHost: false, isBoss: true, isConnected: true },
      { id: 'player', name: 'Player', score: 50, isHost: false, isBoss: false, isConnected: true },
    ]),
    questionHistory: [],
  })
}

function device(game, id, shared = false) {
  const effects = [], routes = []
  let finalBoard, stateIndex = 0
  const mutations = load('lib/liveblocks/mutations.ts', dep => {
    if (dep === './client') return { useMutation: callback => args => callback({ storage: { get: () => game } }, args) }
    if (dep === '@/lib/game/room-clock') return load('lib/game/room-clock.ts', require)
    if (dep === '@/types/game') return types
    if (dep === '@/lib/avatar') return { getAvatarUrl: () => '' }
    return require(dep)
  })
  const components = new Proxy({}, { get: (_, name) => props => {
    if (name === 'FinalBoard') finalBoard = props
    return React.createElement('div', null, props.children)
  } })
  const Page = load(shared ? 'app/[roomId]/game/page.tsx' : 'app/[roomId]/player/[playerId]/page.tsx', dep => {
    if (dep === 'react') return { ...React,
      useEffect: effect => effects.push(effect),
      useState: () => [[ 'ROOM', ...(shared ? [] : ['boss']), id ][stateIndex++], () => {}],
    }
    if (dep === 'next/navigation') return { useRouter: () => ({ push: route => routes.push(route) }) }
    if (dep === '@/lib/liveblocks/client') return { useStorage: selector => selector({ game: game.toImmutable() }) }
    if (dep === '@/lib/liveblocks/mutations') return mutations
    if (dep === '@/lib/guest') return { getOrCreateGuest: () => ({ id }) }
    if (dep === '@/hooks/useHostStateMachine') return { useHostStateMachine: () => {} }
    if (dep === '@/hooks/useCareerPenalties') return { useCareerPenalties: () => ({}) }
    if (dep === '@/hooks/useQuestionTimeLeft') return { useQuestionTimeLeft: () => 0 }
    if (dep === '@/lib/streaks') return { currentStreak: () => 0, streakLeader: () => null }
    if (dep === '@/lib/game/room-clock') return load('lib/game/room-clock.ts', require)
    if (dep === '@/types/game') return types
    if (dep === 'framer-motion') return { motion: new Proxy({}, { get: () => components.Div }), AnimatePresence: components.Div }
    if (dep === 'lucide-react' || dep.startsWith('@/components/')) return components
    return require(dep)
  }).default
  const markup = renderToStaticMarkup(React.createElement(Page, { params: Promise.resolve({ roomId: 'ROOM', playerId: id }) }))
  // The finished-history effect uses localStorage and is unrelated to routing.
  for (const effect of effects) {
    if (!effect.toString().includes('localStorage')) effect()
  }
  return { markup, routes, finalBoard }
}

test('boss rematch keeps player devices on their player view and sends the shared host to the lobby', () => {
  const game = room()
  const boss = device(game, 'boss')
  assert.equal(typeof boss.finalBoard.onRematch, 'function')
  boss.finalBoard.onRematch()
  assert.equal(game.get('command'), 'rematch')
  assert.equal(game.get('hostId'), 'host')
  assert.equal(game.get('bossId'), 'boss')
  assert.equal(game.get('hostPlays'), false)
  assert.equal(game.get('players').get(0).isBoss, true)
  assert.equal(game.get('players').get(0).score, 0)
  for (const id of ['boss', 'player']) {
    const waiting = device(game, id)
    assert.deepEqual(waiting.routes, [], `${id} must keep the player route`)
    assert.match(waiting.markup, /Waiting to start/)
    game.set('command', 'starting')
    assert.match(device(game, id).markup, /Get ready/)
    game.set('command', 'rematch')
  }
  assert.deepEqual(device(game, 'host', true).routes, ['/ROOM/lobby'])
})

test('a playing host still returns to the lobby after rematch', () => {
  const game = room()
  game.set('hostPlays', true)
  const host = device(game, 'host')
  host.finalBoard.onRematch()
  assert.deepEqual(device(game, 'host').routes, ['/ROOM/lobby'])
})
