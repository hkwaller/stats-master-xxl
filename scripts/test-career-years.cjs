const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { LiveList, LiveObject } = require('@liveblocks/client')

function load(file, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', source)(id => {
    if (id in mocks) return mocks[id]
    if (id.startsWith('@/')) return load(`${id.slice(2)}.ts`, mocks)
    return require(id)
  }, module, module.exports)
  return module.exports
}

const designSystem = { MonoLabel: ({ children }) => React.createElement('span', null, children) }
const seasons = [
  { playerId: 1, seasonId: 20052006, season: '2005-06', gamesPlayed: 81, goals: 39, assists: 63, points: 102, penaltyMinutes: 110 },
  { playerId: 1, seasonId: 20062007, season: '2006-07', gamesPlayed: 79, goals: 36, assists: 84, points: 120, penaltyMinutes: 60 },
  { playerId: 1, seasonId: 20072008, season: '2007-08', gamesPlayed: 53, goals: 24, assists: 48, points: 72, penaltyMinutes: 39 },
]

test('hidden years render chronological season numbers on compact and TV views; default/reveal shows dates', () => {
  const { CareerRevealCard } = load('components/game/CareerRevealCard.tsx', {
    react: { ...React, useLayoutEffect: () => {}, useRef: () => ({ current: null }) },
    '@/components/design-system': designSystem,
  })
  for (const size of ['compact', 'tv']) {
    const hidden = renderToStaticMarkup(React.createElement(CareerRevealCard, { size, seasons, revealedCount: 2, showYears: false }))
    assert.match(hidden, /Season 1/)
    assert.match(hidden, /Season 2/)
    assert.ok(!hidden.includes('Season 3'))
    assert.ok(!/2005|2006|2007|2008/.test(hidden), 'hidden years must not leak into visible or accessible markup')
    assert.ok(hidden.indexOf('102') < hidden.indexOf('120'), 'stats remain chronological')
    for (const showYears of [undefined, true]) {
      const visible = renderToStaticMarkup(React.createElement(CareerRevealCard, { size, seasons, revealedCount: 3, showYears }))
      for (const season of seasons) assert.ok(visible.includes(season.season))
      assert.ok(!visible.includes('Season 1'))
    }
  }
})

test('Era visibility, available hint counts and revealed values stay consistent', () => {
  const { HintPanel } = load('components/game/HintPanel.tsx', { '@/components/design-system': designSystem })
  const { SideRail } = load('components/game/SideRail.tsx', { '@/components/design-system': designSystem })
  const props = { question: { era: '2000s', teamNames: 'Pittsburgh Penguins', positionCode: 'C' }, usedHints: ['era', 'team'], hintsEnabled: true, onRequestHint: () => {} }
  const hidden = renderToStaticMarkup(React.createElement(HintPanel, { ...props, showEraHint: false }))
  assert.ok(!hidden.includes('Era') && !hidden.includes('2000s'))
  assert.match(hidden, /1 of 2 revealed/)
  assert.match(hidden, /Pittsburgh Penguins/)
  assert.match(hidden, /Position/)
  const shared = renderToStaticMarkup(React.createElement(SideRail, { ...props, showEraHint: false, answeredCount: 0, totalPlayers: 2 }))
  assert.ok(!shared.includes('Era') && !shared.includes('2000s'))
  assert.match(shared, /Pittsburgh Penguins/)
  for (const showEraHint of [undefined, true]) {
    const available = renderToStaticMarkup(React.createElement(HintPanel, { ...props, showEraHint }))
    assert.match(available, /2000s/)
    assert.match(available, /2 of 3 revealed/)
  }
  assert.equal(renderToStaticMarkup(React.createElement(HintPanel, { ...props, hintsEnabled: false })), '')
})

function room(overrides = {}) {
  const game = new LiveObject({ hostId: 'host', bossId: 'boss', gameMode: 'career', players: new LiveList([]), hintsEnabled: true, hintsUsed: [], ...overrides })
  const mutations = load('lib/liveblocks/mutations.ts', {
    './client': { useMutation: callback => args => callback({ storage: { get: () => game } }, args) },
    '@/lib/avatar': {},
  })
  return { game, mutations }
}

test('room mutations reject redundant Era requests, including older rooms; hidden-year and Classic hints still work', () => {
  for (const careerShowYears of [undefined, true, false]) {
    const { game, mutations } = room({ careerShowYears })
    mutations.useRequestHint()({ hintType: 'era' })
    assert.deepEqual(game.get('hintsUsed'), careerShowYears === false ? ['era'] : [])
    mutations.useRequestHint()({ hintType: 'team' })
    assert.ok(game.get('hintsUsed').includes('team'))
  }
  const classic = room({ gameMode: 'classic' })
  classic.mutations.useRequestHint()({ hintType: 'era' })
  assert.deepEqual(classic.game.get('hintsUsed'), ['era'])
  const disabled = room({ careerShowYears: false, hintsEnabled: false })
  disabled.mutations.useRequestHint()({ hintType: 'era' })
  assert.deepEqual(disabled.game.get('hintsUsed'), [])
})

test('authorized settings save persists year preference and forces typed Career answers; old configs default to years', () => {
  const { DEFAULT_SETUP } = load('types/game.ts')
  assert.equal(DEFAULT_SETUP.careerShowYears, true)
  const { game, mutations } = room()
  const config = { ...DEFAULT_SETUP, gameMode: 'career', careerShowYears: false }
  const save = mutations.useSaveSettings()
  save({ config, requesterId: 'other' })
  assert.equal(game.get('careerShowYears'), undefined)
  save({ config, requesterId: 'host' })
  assert.equal(game.get('careerShowYears'), false)
  assert.equal(game.get('answerMode'), 'freetext')
  mutations.useRematch()('host')
  assert.equal(game.get('careerShowYears'), false, 'rematches retain the setting')
  const { careerShowYears, ...legacyConfig } = config
  save({ config: legacyConfig, requesterId: 'boss' })
  assert.equal(game.get('careerShowYears'), true)
  save({ config: DEFAULT_SETUP, requesterId: 'host' })
  assert.equal(game.get('answerMode'), 'multiplechoice', 'Classic answer choices remain configurable')
})
