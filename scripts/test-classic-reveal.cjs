const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

function load(file, resolve = require) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', source)(resolve, module, module.exports)
  return module.exports
}

const question = {
  id: 1, seasonId: 19811982, season: '1981-82', firstName: 'Guy', lastName: 'Lafleur',
  teamAbbrevs: 'MTL', positionCode: 'R', gamesPlayed: 80, goals: 56,
  assists: 80, points: 136, penaltyMinutes: 20, difficulty: 'medium',
}

function renderSharedScreen(command, controller = true) {
  let stateIndex = 0
  const popovers = []
  const components = new Proxy({}, { get: (_, name) => props => {
    if (name === 'CareerAnswerPopover') popovers.push(props)
    return React.createElement('div', null, props.children)
  } })
  const game = {
    hostId: 'host', gameMode: 'classic', command, currentQuestion: question,
    players: [], questionHistory: [], choices: ['Guy Lafleur', 'Dennis Maruk'],
    answers: {}, questionCount: 10, answerMode: 'multiplechoice',
  }
  const Page = load('app/[roomId]/game/page.tsx', dep => {
    if (dep === 'react') return { ...React, useEffect: () => {},
      useState: () => [['ROOM', controller ? 'host' : 'viewer'][stateIndex++], () => {}] }
    if (dep === 'next/navigation') return { useRouter: () => ({}) }
    if (dep === '@/lib/party/client') return { useStorage: selector => selector({ game }) }
    if (dep === '@/lib/party/mutations') return new Proxy({}, { get: () => () => () => {} })
    if (dep === '@/hooks/useHostStateMachine') return { useHostStateMachine: () => {} }
    if (dep === '@/hooks/useCareerPenalties') return { useCareerPenalties: () => ({}) }
    if (dep === '@/hooks/useQuestionTimeLeft') return { useQuestionTimeLeft: () => 0 }
    if (dep === '@/lib/streaks') return { streakLeader: () => null }
    if (dep === '@/lib/guest') return { getOrCreateGuest: () => ({ id: 'host' }) }
    if (dep === '@/lib/game/room-clock') return { questionPausedAt: () => undefined }
    if (dep === '@/types/game') return { CAREER_REVEAL_INTERVAL_MS: 3000 }
    if (dep === 'framer-motion') return { motion: components, AnimatePresence: components.Div }
    if (dep === 'lucide-react' || dep.startsWith('@/components/')) return components
    return require(dep)
  }).default
  const markup = renderToStaticMarkup(React.createElement(Page, { params: Promise.resolve({ roomId: 'ROOM' }) }))
  return { markup, popovers }
}

test('classic shared screen opens a season reveal dialog instead of the bottom answer band', () => {
  const { markup, popovers } = renderSharedScreen('revealing')
  assert.equal(popovers.length, 1, 'classic reveal must mount the modal')
  assert.equal(popovers[0].scope, 'season')
  assert.equal(popovers[0].question, question)
  assert.deepEqual(popovers[0].seasons, [question])
  assert.equal(typeof popovers[0].onNext, 'function')
  assert.equal(popovers[0].tv, true)
  assert.doesNotMatch(markup, /The answer was/)
  assert.equal(renderSharedScreen('answering').popovers.length, 0)
  assert.equal(renderSharedScreen('revealing', false).popovers[0].onNext, undefined)
})

test('season dialog displays season stats and opens with native modal semantics', () => {
  const effects = []
  const { CareerAnswerPopover } = load('components/game/CareerAnswerPopover.tsx', dep => {
    if (dep === 'react') return { ...React, useEffect: effect => effects.push(effect), useRef: () => ({ current: null }) }
    if (dep === '@/lib/game/career-totals') return load('lib/game/career-totals.ts')
    if (dep.startsWith('@/components/')) return { Button: props => React.createElement('button', null, props.children), PuckMark: () => null }
    return require(dep)
  })
  const markup = renderToStaticMarkup(React.createElement(CareerAnswerPopover, {
    question, seasons: [question], scope: 'season', tv: true,
  }))
  assert.match(markup, /<dialog/)
  assert.match(markup, /aria-labelledby=/)
  assert.match(markup, /Season totals/)
  assert.match(markup, /1981-82/)
  assert.match(markup, /MTL/)
  assert.match(markup, />136</)
  assert.doesNotMatch(markup, /NHL seasons|Career totals|Career revealed/)
  assert.ok(effects.some(effect => effect.toString().includes('showModal()')))
})
