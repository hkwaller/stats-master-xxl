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
  id: 1, playerId: 8448624, seasonId: 19811982, season: '1981-82', firstName: 'Guy', lastName: 'Lafleur',
  teamAbbrevs: 'MTL', positionCode: 'R', gamesPlayed: 80, goals: 56,
  assists: 80, points: 136, penaltyMinutes: 20, difficulty: 'medium',
}
const choices = ['Guy Lafleur', 'Dennis Maruk', 'Mike Bossy', 'Wayne Gretzky']
const { AnswerRow } = load('components/game/AnswerRow.tsx')

function renderSharedScreen(command, controller = true, hintsUsed = []) {
  let stateIndex = 0
  const popovers = []
  const props = {}
  const components = new Proxy({}, { get: (_, name) => p => {
    if (name === 'CareerAnswerPopover') popovers.push(p)
    props[name] = p
    return React.createElement('div', null, p.children)
  } })
  const game = {
    hostId: 'host', gameMode: 'classic', command, currentQuestion: question,
    players: [], questionHistory: [], choices,
    answers: {}, questionCount: 10, answerMode: 'multiplechoice', hintsEnabled: true, hintsUsed,
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
    if (dep === '@/components/game/AnswerRow') return { AnswerRow }
    if (dep === '@/types/game') return { CAREER_REVEAL_INTERVAL_MS: 3000 }
    if (dep === 'framer-motion') return { motion: components, AnimatePresence: components.Div }
    if (dep === 'lucide-react' || dep.startsWith('@/components/')) return components
    return require(dep)
  }).default
  const markup = renderToStaticMarkup(React.createElement(Page, { params: Promise.resolve({ roomId: 'ROOM' }) }))
  return { markup, popovers, props }
}

test('Classic choice badges use the same colours on the shared screen and phone', () => {
  const { PlayerGuessInput } = load('components/game/PlayerGuessInput.tsx', dep => {
    if (dep === './AnswerRow') return { AnswerRow }
    if (dep === './PlayerNameInput') return {}
    if (dep === '@/components/design-system') return { MonoLabel: ({ children }) => children, ProgressTrack: () => null }
    return require(dep)
  })
  const renderPhone = props => renderToStaticMarkup(React.createElement(PlayerGuessInput, {
    answerMode: 'multiplechoice', choices, eliminatedChoices: [], hasAnswered: false,
    answeredCount: 0, totalPlayers: 1, onSubmit: () => {}, ...props,
  }))
  const badgeColours = markup => Array.from(markup.matchAll(/border-radius:50%;background:var\(--color-([^)]+)\);[^>]*>([A-D])<\/span>/g),
    ([, colour, letter]) => [letter, colour])
  const sharedColours = badgeColours(renderSharedScreen('answering').markup)

  assert.deepEqual(sharedColours, [['A', 'cobalt'], ['B', 'lemon'], ['C', 'tangerine'], ['D', 'pink']])
  assert.deepEqual(badgeColours(renderPhone()), sharedColours)
  const locked = renderPhone({ hasAnswered: true, selected: choices[1] })
  assert.match(locked, /LOCKED IN/)
  assert.deepEqual(badgeColours(locked), sharedColours.filter(([letter]) => letter !== 'B'))
})

test('classic shared screen reveals the card in place, with Next card for controllers only', () => {
  const { markup, popovers, props } = renderSharedScreen('revealing')
  assert.equal(popovers.length, 0, 'classic reveal stays on the board, not in a dialog')
  assert.equal(props.MysteryCard.revealed.name, 'Guy Lafleur')
  assert.equal(props.MysteryCard.revealed.playerId, question.playerId)
  assert.match(markup, /The card was/)
  assert.match(markup, /Guy Lafleur/)
  assert.ok(props.TvHeader.controls.some((c) => c.label === 'Next card' && typeof c.onClick === 'function'))
  assert.equal(renderSharedScreen('answering').props.MysteryCard.revealed, null)
  assert.equal(renderSharedScreen('revealing', false).props.TvHeader.controls.length, 0)
})

test('mystery card requests an available photo only on reveal', () => {
  const { MysteryCard } = load('components/cards/MysteryCard.tsx', dep => {
    if (dep === '@/lib/data/player-photos') {
      return load('lib/data/player-photos.ts', name => ({ default: require(`../lib/data/${name}`) }))
    }
    return require(dep)
  })
  const render = revealed => renderToStaticMarkup(React.createElement(MysteryCard, {
    season: null, cardNumber: 1, chips: [], revealed,
  }))

  assert.doesNotMatch(render(null), /<img/)
  assert.doesNotMatch(render({ playerId: 0, name: 'Unknown skater', detail: '' }), /<img/)
  const markup = render({ playerId: 8478402, name: 'Connor McDavid', detail: 'Edmonton' })
  assert.match(markup, /<img[^>]*src="\/player-photos\/8478402\.jpg"/)
  assert.ok(fs.existsSync(path.join(__dirname, '../public/player-photos/8478402.jpg')))

  const [[id, photo]] = Object.entries(require('../lib/data/imported-player-photos.json'))
  assert.match(render({ playerId: Number(id), name: 'Imported player', detail: '' }), /<img[^>]+wikimedia\.org/)
  assert.ok(photo.creator)
  assert.equal(new URL(photo.sourceUrl).origin, 'https://commons.wikimedia.org')
  assert.equal(new URL(photo.licenseUrl).origin, 'https://creativecommons.org')
})

test('classic season stays hidden until the shared hint or answer reveal', () => {
  const hidden = renderSharedScreen('answering', true, ['team', 'position'])
  assert.equal(hidden.props.MysteryCard.season, null)
  assert.doesNotMatch(hidden.markup, /1981[–-]82/)

  const hinted = renderSharedScreen('answering', true, ['era'])
  assert.equal(hinted.props.MysteryCard.season, question.season)
  assert.match(hinted.markup, /1981–82/)

  assert.equal(renderSharedScreen('revealing').props.MysteryCard.season, question.season)
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
