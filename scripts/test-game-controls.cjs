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
  const resolve = id => {
    if (id in mocks) return mocks[id]
    if (id.startsWith('@/')) {
      const file = id.slice(2)
      return load(`${file}${fs.existsSync(path.join(__dirname, '..', `${file}.ts`)) ? '.ts' : '.tsx'}`, mocks)
    }
    return require(id)
  }
  new Function('require', 'module', 'exports', source)(resolve, module, module.exports)
  return module.exports
}
const iso = ms => new Date(ms).toISOString()
const clock = load('lib/game/room-clock.ts')

function room(overrides = {}) {
  const question = { id: 'q', playerId: 1, firstName: 'Paul', lastName: 'Coffey', difficulty: 'easy' }
  const game = new LiveObject({
    hostId: 'host', bossId: 'boss', command: 'answering', gameMode: 'career',
    questionCount: 2, currentQuestionIndex: 0, currentQuestion: question,
    questionSequence: [question, question], questionStartsAt: iso(100_000), pausedAt: '',
    careerData: [{ seasons: [question], fullCareer: true }, { seasons: [question], fullCareer: true }],
    careerSeasons: Array(10).fill(question), revealedSeasonCount: 1,
    careerPausedAt: '', careerPausedDurationMs: 0, careerPenaltyEndsAt: {},
    buzzedInPlayerId: '', buzzedInSeasonCount: 0, lockedOutPlayers: [],
    answers: {}, answeredAt: {}, questionHistory: [], playedQuestions: new LiveList([]),
    players: new LiveList(['host', 'boss', 'player'].map(id => ({ id, name: id, score: 0, isConnected: true }))),
    ...overrides,
  })
  const mutations = load('lib/liveblocks/mutations.ts', {
    './client': { useMutation: callback => args => callback({ storage: { get: () => game } }, args) },
    '@/lib/avatar': { getAvatarUrl: () => '' },
  })
  return { game, mutations }
}
function at(now, callback) {
  const originalNow = Date.now
  Date.now = () => now
  try { return callback() } finally { Date.now = originalNow }
}

test('host and boss can pause/resume; other players cannot; repeated pause is idempotent', () => {
  const { game, mutations: m } = room()
  const pause = m.useSetGamePaused()
  at(102_000, () => pause({ requesterId: 'player', paused: true }))
  assert.equal(game.get('pausedAt'), '')
  at(102_000, () => pause({ requesterId: 'host', paused: true }))
  at(110_000, () => pause({ requesterId: 'boss', paused: true }))
  assert.equal(game.get('pausedAt'), iso(102_000))
  at(120_000, () => pause({ requesterId: 'player', paused: false }))
  assert.equal(game.get('pausedAt'), iso(102_000))
  at(122_000, () => pause({ requesterId: 'boss', paused: false }))
  assert.equal(game.get('pausedAt'), '')
  assert.equal(game.get('questionStartsAt'), iso(120_000))
  at(130_000, () => pause({ requesterId: 'host', paused: false }))
  assert.equal(game.get('questionStartsAt'), iso(120_000))
  game.set('command', 'finished')
  pause({ requesterId: 'host', paused: true })
  assert.equal(game.get('pausedAt'), '')
})

test('paused rooms reject all gameplay mutations, including late reveal/timeout callbacks', () => {
  const { game, mutations: m } = room({ pausedAt: iso(102_000), hintsEnabled: true, powerupsEnabled: true })
  const before = game.toImmutable()
  for (const [hook, args] of [
    ['useBuzzIn', { playerId: 'player' }],
    ['useSubmitAnswer', { playerId: 'player', answer: 'Coffey' }],
    ['useSubmitCareerAnswer', { playerId: 'player', answer: 'Coffey' }],
    ['useCancelCareerBuzz', { playerId: 'player' }],
    ['useRequestHint', { hintType: 'era' }],
    ['useActivatePowerup', { playerId: 'player', powerupType: 'freeze' }],
    ...['useTickCountdown', 'useRevealNextColumn', 'useRevealNextCareerSeason', 'useRevealCareerAnswer',
      'useRevealAnswers', 'useRevealH2HAnswers', 'useRevealHLAnswers', 'useSkipQuestion', 'useAdvanceToNext']
      .map(hook => [hook, 'host']),
    ...['useNextQuestion', 'useNextCareerRound', 'useNextH2HRound', 'useNextHLRound']
      .map(hook => [hook, { requesterId: 'host', choices: [] }]),
  ]) {
    m[hook]()(args)
    assert.deepEqual(game.toImmutable(), before, hook)
  }
})

test('wrong guesses expire after ten seconds, allowing another attempt and a correct score', () => {
  const { game, mutations: m } = room()
  at(102_000, () => m.useBuzzIn()({ playerId: 'player' }))
  at(104_000, () => m.useSubmitCareerAnswer()({ playerId: 'player', answer: 'Wrong' }))
  assert.equal(game.get('careerPenaltyEndsAt').player, 114_000)
  assert.equal(game.get('buzzedInPlayerId'), '')
  assert.deepEqual(clock.careerPenaltySeconds(game.get('careerPenaltyEndsAt'), 104_000), { player: 10 })
  at(113_999, () => m.useBuzzIn()({ playerId: 'player' }))
  assert.equal(game.get('buzzedInPlayerId'), '')
  at(114_000, () => m.useBuzzIn()({ playerId: 'player' }))
  assert.equal(game.get('buzzedInPlayerId'), 'player')
  at(115_000, () => m.useSubmitCareerAnswer()({ playerId: 'player', answer: 'Coffey' }))
  assert.equal(game.get('command'), 'revealing')
  assert.equal(game.get('players').get(2).score, 150)
  assert.equal(game.get('questionHistory')[0].playerAnswers.player.correct, true)
})

test('manual pause freezes penalties without reinstating an already expired penalty', () => {
  const { game, mutations: m } = room({ careerPenaltyEndsAt: { player: 114_000, expired: 101_000 } })
  at(107_000, () => m.useSetGamePaused()({ requesterId: 'boss', paused: true }))
  assert.deepEqual(clock.careerPenaltySeconds(game.get('careerPenaltyEndsAt'), Date.parse(game.get('pausedAt'))), { player: 7 })
  at(127_000, () => m.useSetGamePaused()({ requesterId: 'host', paused: false }))
  assert.deepEqual(clock.careerPenaltySeconds(game.get('careerPenaltyEndsAt'), 127_000), { player: 7 })
  assert.deepEqual(clock.careerPenaltySeconds(game.get('careerPenaltyEndsAt'), 134_000), {})
})

test('pausing during possession preserves the answering slot and the remaining season interval', () => {
  const { game, mutations: m } = room()
  at(102_000, () => m.useBuzzIn()({ playerId: 'player' }))
  at(104_000, () => m.useSetGamePaused()({ requesterId: 'host', paused: true }))
  assert.equal(clock.questionPausedAt(game.toImmutable()), iso(102_000))
  at(124_000, () => m.useSetGamePaused()({ requesterId: 'boss', paused: false }))
  assert.equal(game.get('buzzedInPlayerId'), 'player')
  assert.equal(game.get('questionStartsAt'), iso(120_000))
  assert.equal(game.get('careerPausedAt'), iso(122_000))
  at(125_000, () => m.useCancelCareerBuzz()({ playerId: 'player' }))
  assert.equal(game.get('careerPausedDurationMs'), 3000, 'exclude the twenty-second manual pause')
  const nextRevealAt = Date.parse(game.get('questionStartsAt')) + game.get('careerPausedDurationMs') + 3000
  assert.equal(nextRevealAt - 125_000, 1000)
  assert.deepEqual(game.get('careerPenaltyEndsAt'), {})
})

test('manual pauses do not reduce speed bonuses in classic, H2H or higher/lower', () => {
  for (const gameMode of ['classic', 'h2h', 'higher-lower']) {
    const { game, mutations: m } = room({ gameMode })
    at(102_000, () => m.useSetGamePaused()({ requesterId: 'host', paused: true }))
    at(122_000, () => m.useSetGamePaused()({ requesterId: 'boss', paused: false }))
    at(125_000, () => m.useSubmitAnswer()({ playerId: 'player', answer: 'Coffey' }))
    assert.equal(game.get('answeredAt').player, 5000, gameMode)
  }
})

test('startup countdown pauses, and round/rematch resets clear penalties', () => {
  const { game, mutations: m } = room({ command: 'starting', countdownTime: 3 })
  at(102_000, () => m.useSetGamePaused()({ requesterId: 'host', paused: true }))
  m.useTickCountdown()('host')
  assert.equal(game.get('countdownTime'), 3)
  at(122_000, () => m.useSetGamePaused()({ requesterId: 'boss', paused: false }))
  m.useTickCountdown()('host')
  assert.equal(game.get('countdownTime'), 2)
  game.update({ command: 'next', careerPenaltyEndsAt: { player: 200_000 } })
  m.useNextCareerRound()({ requesterId: 'host' })
  assert.deepEqual(game.get('careerPenaltyEndsAt'), {})
  game.update({ pausedAt: iso(122_000), careerPenaltyEndsAt: { player: 200_000 } })
  m.useRematch()('boss')
  assert.equal(game.get('pausedAt'), '')
  assert.deepEqual(game.get('careerPenaltyEndsAt'), {})
})

test('host state machine schedules no progression while paused', () => {
  const { game } = room({ pausedAt: iso(102_000) })
  for (const command of ['starting', 'question', 'next', 'answering']) {
    const effects = []
    const { useHostStateMachine } = load('hooks/useHostStateMachine.ts', {
      react: { useEffect: effect => effects.push(effect), useState: () => [0, () => {}] },
    })
    game.set('command', command)
    useHostStateMachine(true, 'host', game.toImmutable(), {})
    // Any unexpected work would throw because no mutations are supplied.
    for (const effect of effects) assert.equal(effect(), undefined)
  }
})

test('both screens expose Pause/Resume to host and boss and disable player input while paused', () => {
  const { game } = room()
  const Div = props => React.createElement('div', null, props.children)
  for (const gameMode of ['career', 'classic']) for (const shared of [false, true]) for (const id of ['host', 'boss', 'player']) for (const paused of [false, true]) {
    game.set('gameMode', gameMode)
    game.set('hintsEnabled', true)
    game.set('pausedAt', paused ? iso(102_000) : '')
    let stateIndex = 0
    const components = new Proxy({}, { get: (_, name) => {
      if (name === 'Clock' || name === 'ProgressTrack') return () => React.createElement('span', { 'data-component': name })
      if (name === 'HintPanel') return () => React.createElement('span', { 'data-component': name })
      if (name === 'GamePausedBanner') return () => React.createElement('div', { role: 'status' }, 'Game paused')
      if (name === 'SideRail') return props => React.createElement('div', null,
        props.controls.map(c => React.createElement('button', { key: c.label }, c.label)))
      return Div
    } })
    const mocks = {
      react: { ...React, useEffect: () => {}, useState: () => [[ 'ROOM', ...(shared ? [] : ['player']), id ][stateIndex++], () => {}] },
      'next/navigation': { useRouter: () => ({ push: () => {} }) },
      '@/lib/liveblocks/client': { useStorage: select => select({ game: game.toImmutable() }) },
      '@/lib/liveblocks/mutations': new Proxy({}, { get: () => () => () => {} }),
      '@/lib/guest': {},
      '@/hooks/useHostStateMachine': { useHostStateMachine: () => {} },
      '@/hooks/useQuestionTimeLeft': { useQuestionTimeLeft: () => 20 },
      '@/hooks/useCareerPenalties': { useCareerPenalties: () => ({}) },
      '@/lib/streaks': { currentStreak: () => 0, streakLeader: () => null },
      'framer-motion': { motion: new Proxy({}, { get: () => Div }), AnimatePresence: Div },
      'lucide-react': components,
    }
    const file = shared ? 'app/[roomId]/game/page.tsx' : 'app/[roomId]/player/[playerId]/page.tsx'
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
    for (const match of source.matchAll(/from '(@\/components\/[^']+)'/g)) mocks[match[1]] = components
    const Page = load(file, mocks).default
    const markup = renderToStaticMarkup(React.createElement(Page, { params: Promise.resolve({}) }))
    assert.equal(markup.includes(paused ? 'Resume' : 'Pause'), id !== 'player', `${file}: ${id}`)
    assert.equal(markup.includes('Game paused'), paused)
    if (!shared) {
      assert.equal(/<fieldset disabled=""/.test(markup), paused)
      assert.ok(markup.includes('data-component="HintPanel"'), `${gameMode}: players must be able to request enabled hints`)
    }
    for (const name of ['Clock', 'ProgressTrack']) {
      assert.equal(markup.includes(`data-component="${name}"`), gameMode !== 'career', `${file}: career length must not leak through ${name}`)
    }
  }
})

test('penalty display counts down and returns to the buzzer at expiry', () => {
  const Div = props => React.createElement('div', null, props.children)
  const { BuzzInButton } = load('components/game/BuzzInButton.tsx', {
    react: { ...React, useEffect: () => {}, useState: () => ['', () => {}] },
    'framer-motion': { motion: { button: ({ whileTap, transition, ...props }) => React.createElement('button', props) } },
    '@/components/design-system': { MonoLabel: Div, Button: Div },
    './PlayerNameInput': { PlayerNameInput: Div },
  })
  for (const penaltySeconds of [10, 1, 0]) {
    const markup = renderToStaticMarkup(React.createElement(BuzzInButton, {
      playerId: 'player', buzzedInPlayerId: '', penaltySeconds,
      onBuzzIn: () => {}, onCancel: () => {}, onSubmitAnswer: () => {},
    }))
    assert.equal(markup.includes('Penalty box'), penaltySeconds > 0)
    if (penaltySeconds > 0) assert.ok(markup.includes(`buzz again in ${penaltySeconds}s`))
    else assert.ok(markup.includes('Buzz in'))
  }
})

test('career hint buttons reveal shared values on player phones and the shared display', () => {
  const { game, mutations: m } = room({ hintsEnabled: true, careerShowYears: false })
  const Div = props => React.createElement('div', null, props.children)
  const design = { MonoLabel: Div, Avatar: Div }
  const { HintPanel } = load('components/game/HintPanel.tsx', { '@/components/design-system': design })
  const { SideRail } = load('components/game/SideRail.tsx', { '@/components/design-system': design })
  const question = { ...game.get('currentQuestion'), era: '1980s', teamNames: 'Edmonton Oilers', positionCode: 'D' }
  const panelProps = () => ({ question, usedHints: game.get('hintsUsed') ?? [], hintsEnabled: game.get('hintsEnabled'), showEraHint: game.get('careerShowYears') === false, onRequestHint: hintType => m.useRequestHint()({ hintType }) })
  const buttons = []
  function findButtons(node) {
    if (Array.isArray(node)) return node.forEach(findButtons)
    if (!React.isValidElement(node)) return
    if (node.type === 'button') buttons.push(node)
    findButtons(node.props.children)
  }
  findButtons(HintPanel(panelProps()))
  assert.equal(buttons.length, 3)
  for (const button of buttons) {
    assert.match(button.props['aria-label'], /Reveal .* hint for everyone/)
    button.props.onClick()
  }
  // Repeated requests cannot duplicate a shared hint.
  buttons[0].props.onClick()
  assert.deepEqual(game.get('hintsUsed'), ['era', 'team', 'position'])
  const phone = renderToStaticMarkup(React.createElement(HintPanel, panelProps()))
  const shared = renderToStaticMarkup(React.createElement(SideRail, {
    question, usedHints: game.get('hintsUsed'), hintsEnabled: true, answeredCount: 0, totalPlayers: 3,
  }))
  for (const markup of [phone, shared]) for (const value of ['1980s', 'Edmonton Oilers', 'Defenseman']) assert.ok(markup.includes(value))
  assert.ok(!phone.includes('<button'))
  game.update({ hintsEnabled: false, hintsUsed: [] })
  assert.equal(HintPanel(panelProps()), null)
  m.useRequestHint()({ hintType: 'era' })
  assert.deepEqual(game.get('hintsUsed'), [])
})

test('career setup exposes the hints toggle, alongside classic', () => {
  const Div = props => React.createElement('div', null, props.children)
  for (const gameMode of ['classic', 'career', 'h2h', 'higher-lower']) {
    const { default: Setup } = load('app/[roomId]/setup/page.tsx', {
      react: { ...React, useEffect: () => {}, useState: initial => [initial?.gameMode ? { ...initial, gameMode } : initial, () => {}] },
      'next/navigation': { useRouter: () => ({}) },
      '@/lib/liveblocks/client': { useStorage: () => ({ hostId: '' }) },
      '@/lib/liveblocks/mutations': { useSaveSettings: () => () => {} },
      '@/lib/guest': {},
      '@/hooks/useSetupPool': { useSetupPool: () => ({ count: 20, loading: false, error: false }) },
      '@/components/game/AnimatedPoolCount': { AnimatedPoolCount: () => null },
      '@/components/arcade/RinkBg': { RinkBg: () => null },
      '@/components/arcade': { PuckMark: () => null, JumbotronPanel: Div },
      '@/components/design-system': { Button: Div, Kickplate: Div, MonoLabel: Div },
    })
    const markup = renderToStaticMarkup(React.createElement(Setup, { params: Promise.resolve({}) }))
    assert.equal(markup.includes('aria-label="Hints"'), gameMode === 'career' || gameMode === 'classic', gameMode)
    assert.equal(markup.includes('aria-label="Power plays"'), gameMode === 'classic', gameMode)
    assert.equal(markup.includes('aria-label="About Power Plays"'), gameMode === 'classic', gameMode)
    if (gameMode === 'career') {
      assert.ok(!markup.includes('Multiple choice'))
      assert.ok(markup.includes('Buzz in and type'))
      assert.ok(markup.includes('Show years') && markup.includes('Hide years'))
    } else {
      assert.ok(markup.includes('Multiple choice'))
      assert.ok(!markup.includes('Hide years'))
    }
  }
})
