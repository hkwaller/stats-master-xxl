const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

// Exercise the production modules without requiring a database or Liveblocks room.
function load(file, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const module = { exports: {} }
  const resolve = (id) => {
    if (id in mocks) return mocks[id]
    if (id === '@/types/game') return load('types/game.ts')
    return require(id)
  }
  new Function('require', 'module', 'exports', source)(resolve, module, module.exports)
  return module.exports
}

const { CAREER_REVEAL_INTERVAL_MS } = load('types/game.ts')

test('full careers survive pagination, era selection, and legacy reveal settings', async () => {
  const rows = Array.from({ length: 1005 }, (_, i) => ({
    id: i + 1, player_id: i + 100, season_id: 19901991, points: 0, era: '1990s',
  }))
  // A long career crossing the selected era, deliberately returned newest first.
  for (let year = 2004; year >= 1980; year--) rows.push({
    id: rows.length + 1, player_id: 1, first_name: 'Test', last_name: 'Skater',
    season_id: year * 10000 + year + 1, points: year === 1990 ? 150 : 10,
    era: `${Math.floor(year / 10) * 10}s`, games_played: 80, goals: 5,
    assists: 5, penalty_minutes: 10, position_code: 'C',
    team_abbrevs: 'TST', team_names: 'Test',
  })
  rows.push({ ...rows.at(-1), id: rows.length + 1 })
  let pagesRead = 0
  const db = load('lib/data/database.ts', {
    'server-only': {},
    '@/lib/supabase/server': { createSupabaseClient: () => ({ from: () => ({
      select: () => {
        let selected = rows
        let start = 0, end = 999
        const query = {
          order: () => query,
          range: (a, b) => { start = a; end = b; return query },
          in: (_, ids) => { selected = selected.filter(row => ids.includes(row.player_id)); return query },
          then: (resolve) => { pagesRead++; return Promise.resolve({ data: selected.slice(start, end + 1), error: null, count: selected.length }).then(resolve) },
        }
        return query
      },
    }) }) },
  })
  const options = { minSeasons: 5, count: 1, eras: ['1990s'], difficultyTiers: ['easy'], maxReveals: 8, revealOrder: 'best-first' }
  const [career] = await db.getCareerQuestions(options)
  assert.equal(career.seasons.length, 25)
  assert.equal(career.fullCareer, true)
  assert.equal(career.seasons[0].season, '1980-81')
  assert.equal(career.seasons.at(-1).season, '2004-05')
  assert.equal(career.totalCareerPoints, 390)
  assert.equal(await db.getCareerPlayerCount(options), 1)
  assert.deepEqual(await db.getCareerQuestions({ ...options, excludePlayerIds: [1] }), [])
  assert.ok(pagesRead >= 7)
})

test('each season gets three seconds, including the last, using the shared start time', () => {
  assert.equal(CAREER_REVEAL_INTERVAL_MS, 3000)
  const originalTimeout = global.setTimeout
  const originalNow = Date.now
  try {
    for (const count of [1, 2, 25]) {
      const effects = [], calls = [], timers = []
      const { useHostStateMachine } = load('hooks/useHostStateMachine.ts', {
        react: { useEffect: effect => effects.push(effect), useState: () => [0, () => {}] },
      })
      Date.now = () => 100_000 + (count - 1) * 3000 + 250
      global.setTimeout = (callback, delay) => { timers.push({ callback, delay }); return 1 }
      const game = {
        gameMode: 'career', command: 'answering', questionStartsAt: new Date(100_000).toISOString(),
        careerSeasons: Array(25).fill({}), revealedSeasonCount: count, careerData: [],
      }
      useHostStateMachine(true, 'host', game, {
        revealNextCareerSeason: () => calls.push('season'),
        revealCareerAnswer: () => calls.push('answer'),
      })
      effects.forEach(effect => effect())
      assert.deepEqual(calls, [], 'the last season must not expire immediately')
      assert.equal(timers.length, 1)
      assert.equal(timers[0].delay, 2750, 'render latency must not extend the round')
      timers[0].callback()
      assert.deepEqual(calls, [count === 25 ? 'answer' : 'season'])
    }
  } finally { global.setTimeout = originalTimeout; Date.now = originalNow }
})

test('career countdown uses the full duration instead of the classic thirty seconds', () => {
  const { useQuestionTimeLeft } = load('hooks/useQuestionTimeLeft.ts', {
    react: { useEffect: () => {}, useState: () => [115_000, () => {}] },
  })
  const start = new Date(100_000).toISOString()
  assert.equal(useQuestionTimeLeft(start, true, 25 * 3000), 60)
  assert.equal(useQuestionTimeLeft(start, true), 15)
  assert.equal(useQuestionTimeLeft(start, true, 15_000, 0, new Date(102_000).toISOString()), 13)
  assert.equal(useQuestionTimeLeft(start, true, 15_000, 10_000), 10)
  assert.equal(useQuestionTimeLeft(new Date(1).toISOString(), true, 3000), 0)
})

test('only revealed rows render, with one scrolling table following each new season', () => {
  const effects = [], scrolls = []
  const container = { scrollHeight: 900, scrollTo: args => scrolls.push(args) }
  const { CareerRevealCard } = load('components/game/CareerRevealCard.tsx', {
    react: { ...React, useEffect: effect => effects.push(effect), useLayoutEffect: effect => effects.push(effect), useRef: () => ({ current: container }) },
    'framer-motion': { motion: {
      tr: ({ initial, animate, transition, ...props }) => React.createElement('tr', props),
      div: ({ initial, animate, transition, ...props }) => React.createElement('div', props),
    } },
    '@/components/design-system': { MonoLabel: ({ children }) => React.createElement('span', null, children) },
  })
  const originalWindow = global.window
  global.window = { matchMedia: () => ({ matches: true }) }
  try {
    const seasons = Array.from({ length: 25 }, (_, i) => ({ id: String(i), playerId: 1, seasonId: i, season: `${1980 + i}-${String(81 + i).slice(-2)}`, points: 100, gamesPlayed: 80, goals: 40, assists: 60, penaltyMinutes: 20 }))
    for (const count of [1, 12, 25, 1]) {
      effects.length = 0
      const markup = renderToStaticMarkup(React.createElement(CareerRevealCard, { seasons, revealedCount: count }))
      assert.equal((markup.match(/<table /g) || []).length, 1)
      assert.equal((markup.match(/<tr/g) || []).length, count + 1)
      if (count < 25) assert.ok(!markup.includes(seasons[count].season))
      effects.forEach(effect => effect())
      assert.equal(scrolls.at(-1).top, count === 1 ? 0 : 900)
      assert.equal(scrolls.at(-1).behavior, 'instant')
      assert.ok(markup.includes('table-fixed'))
      assert.ok(!markup.includes('opacity'), 'reveals must never hide the numbers')
    }
  } finally { global.window = originalWindow }
})

test('legacy room careers are restored without restarting the round', () => {
  const { useRefreshCareerData } = load('lib/liveblocks/mutations.ts', {
    './client': { useMutation: callback => args => callback({ storage: { get: () => game } }, args) },
    '@/lib/avatar': {},
  })
  const originalNow = Date.now
  const seasons = Array.from({ length: 19 }, (_, i) => ({ id: String(i), seasonId: 1990 + i, playerId: 1 }))
  const career = { playerId: 1, seasons, fullCareer: true }
  const values = new Map(Object.entries({
    hostId: 'host', gameMode: 'career', command: 'answering', currentQuestionIndex: 0,
    questionStartsAt: new Date(100_000).toISOString(), revealedSeasonCount: 3,
    careerData: [{ playerId: 1, seasons: seasons.filter((_, i) => i % 3 === 0) }],
  }))
  const game = { get: key => values.get(key), set: (key, value) => values.set(key, value) }
  try {
    Date.now = () => 109_000
    const restore = useRefreshCareerData()
    restore({ requesterId: 'other', careers: [career] })
    assert.equal(values.get('careerData')[0].fullCareer, undefined)
    restore({ requesterId: 'host', careers: [career] })
    assert.equal(values.get('careerSeasons').length, 19)
    assert.equal(values.get('revealedSeasonCount'), 4)
    assert.equal(values.get('questionStartsAt'), new Date(100_000).toISOString())
    assert.equal(values.get('command'), 'answering')
  } finally { Date.now = originalNow }
})

test('career result shows Correct with earned points even when the live answer list is empty', () => {
  const { RevealResult } = load('components/game/RevealResult.tsx', {
    'framer-motion': { motion: {
      div: ({ initial, animate, transition, ...props }) => React.createElement('div', props),
    } },
    '@/components/design-system': { MonoLabel: ({ children }) => React.createElement('span', null, children) },
  })
  const question = { firstName: 'Paul', lastName: 'Coffey', season: '1980-81' }
  const history = [{ question, playerAnswers: { me: { answer: 'Paul Coffey', correct: true, points: 100 } } }]
  const markup = renderToStaticMarkup(React.createElement(RevealResult, { question, history, myId: 'me', hasAnswered: false }))
  assert.ok(markup.includes('Correct'))
  assert.ok(markup.includes('+100'))
  assert.ok(!markup.includes('No answer'))
  for (const [answer, expected] of [['Wayne Gretzky', 'Missed'], ['', 'No answer']]) {
    const resultHistory = [{ question, playerAnswers: { me: { answer, correct: false, points: 0 } } }]
    const resultMarkup = renderToStaticMarkup(React.createElement(RevealResult, {
      question, history: resultHistory, myId: 'me',
    }))
    assert.ok(resultMarkup.includes(expected))
  }
})

test('career submission records the winner and preserves earlier wrong guesses in results', () => {
  const { LiveList } = require('@liveblocks/client')
  const question = { firstName: 'Paul', lastName: 'Coffey' }
  const players = new LiveList([{ id: 'me', score: 0 }, { id: 'other', score: 0 }])
  const values = new Map(Object.entries({
    command: 'answering', gameMode: 'career', hostId: 'host', currentQuestion: question,
    buzzedInPlayerId: 'me', buzzedInSeasonCount: 7, careerSeasons: Array(22).fill({}),
    players, answers: { other: 'Wayne Gretzky' }, questionHistory: [], playedQuestions: new LiveList([]),
  }))
  const game = { get: key => values.get(key), set: (key, value) => values.set(key, value) }
  const mutations = load('lib/liveblocks/mutations.ts', {
    './client': { useMutation: callback => args => callback({ storage: { get: () => game } }, args) },
    '@/lib/avatar': {},
  })
  mutations.useSubmitCareerAnswer()({ playerId: 'me', answer: 'Paul Coffey' })
  assert.equal(values.get('answers').me, 'Paul Coffey')
  const results = values.get('questionHistory')[0].playerAnswers
  assert.deepEqual(results.me, { answer: 'Paul Coffey', correct: true, points: 100 })
  assert.deepEqual(results.other, { answer: 'Wayne Gretzky', correct: false, points: 0 })
  assert.equal(players.get(0).score, 100)
  // Timeout must preserve a wrong answer too.
  values.set('command', 'answering')
  mutations.useRevealCareerAnswer()('host')
  assert.equal(values.get('questionHistory').at(-1).playerAnswers.other.answer, 'Wayne Gretzky')
})

test('buzzing blocks season reveals and expiry, then preserves the remaining reveal interval', () => {
  const { LiveList } = require('@liveblocks/client')
  const values = new Map(Object.entries({
    command: 'answering', gameMode: 'career', hostId: 'host', buzzedInPlayerId: '',
    lockedOutPlayers: [], revealedSeasonCount: 1, careerSeasons: Array(5).fill({}),
    currentQuestion: { firstName: 'Paul', lastName: 'Coffey' },
    players: new LiveList([{ id: 'me', score: 0 }]), playedQuestions: new LiveList([]),
    questionStartsAt: new Date(100_000).toISOString(),
  }))
  const game = { get: key => values.get(key), set: (key, value) => values.set(key, value) }
  const mutations = load('lib/liveblocks/mutations.ts', {
    './client': { useMutation: callback => args => callback({ storage: { get: () => game } }, args) },
    '@/lib/avatar': {},
  })
  const originalNow = Date.now
  try {
    Date.now = () => 102_000 // one second remains before the next season
    mutations.useBuzzIn()({ playerId: 'me' })
    Date.now = () => 112_000 // spends ten seconds answering
    mutations.useRevealNextCareerSeason()('host')
    assert.equal(values.get('revealedSeasonCount'), 1)
    mutations.useRevealCareerAnswer()('host')
    assert.equal(values.get('command'), 'answering')
    mutations.useSubmitCareerAnswer()({ playerId: 'me', answer: 'Wrong' })
    assert.equal(values.get('buzzedInPlayerId'), '')
    assert.equal(values.get('careerPausedAt'), '')
    assert.equal(values.get('careerPausedDurationMs'), 10_000)
    const effects = [], timers = []
    const originalTimeout = global.setTimeout
    try {
      global.setTimeout = (callback, delay) => { timers.push({ callback, delay }); return 1 }
      const { useHostStateMachine } = load('hooks/useHostStateMachine.ts', {
        react: { useEffect: effect => effects.push(effect), useState: () => [0, () => {}] },
      })
      useHostStateMachine(true, 'host', Object.fromEntries(values), {
        revealNextCareerSeason: () => {}, revealCareerAnswer: () => {},
      })
      effects.forEach(effect => effect())
      assert.equal(timers.length, 1)
      assert.equal(timers[0].delay, 1000)
    } finally { global.setTimeout = originalTimeout }
  } finally { Date.now = originalNow }
})

test('only the buzzer can cancel, without a penalty, and can buzz again', () => {
  const values = new Map(Object.entries({
    command: 'answering', gameMode: 'career', buzzedInPlayerId: 'me', buzzedInSeasonCount: 2,
    careerPausedAt: new Date(100_000).toISOString(), careerPausedDurationMs: 2000,
    lockedOutPlayers: [], answers: {}, revealedSeasonCount: 2,
  }))
  const game = { get: key => values.get(key), set: (key, value) => values.set(key, value) }
  const mutations = load('lib/liveblocks/mutations.ts', {
    './client': { useMutation: callback => args => callback({ storage: { get: () => game } }, args) },
    '@/lib/avatar': {},
  })
  const originalNow = Date.now
  try {
    Date.now = () => 105_000
    const cancel = mutations.useCancelCareerBuzz()
    cancel({ playerId: 'other' })
    assert.equal(values.get('buzzedInPlayerId'), 'me')
    cancel({ playerId: 'me' })
    assert.equal(values.get('buzzedInPlayerId'), '')
    assert.equal(values.get('careerPausedAt'), '')
    assert.equal(values.get('careerPausedDurationMs'), 7000)
    assert.deepEqual(values.get('lockedOutPlayers'), [])
    assert.deepEqual(values.get('answers'), {})
    assert.equal(values.get('revealedSeasonCount'), 2)
    mutations.useBuzzIn()({ playerId: 'me' })
    assert.equal(values.get('buzzedInPlayerId'), 'me')
    assert.equal(values.get('buzzedInSeasonCount'), 2)
  } finally { Date.now = originalNow }
})

test('career answer totals include every season exactly once', () => {
  const { careerTotals } = load('lib/game/career-totals.ts')
  const first = { seasonId: 19901991, gamesPlayed: 77, goals: 31, assists: 48, points: 79, penaltyMinutes: 66 }
  const second = { seasonId: 19911992, gamesPlayed: 80, goals: 32, assists: 54, points: 86, penaltyMinutes: 72 }
  assert.deepEqual(careerTotals([first, second, { ...second }]), {
    seasons: 2, gamesPlayed: 157, goals: 63, assists: 102, points: 165, penaltyMinutes: 138,
  })
})
