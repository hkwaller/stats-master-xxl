const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { TestRecord } = require('./helpers/game-rules.cjs')

function load(file, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', source)(id => {
    if (id in mocks) return mocks[id]
    if (id.startsWith('@/')) {
      const file = id.slice(2)
      return load(`${file}${fs.existsSync(path.join(__dirname, '..', `${file}.ts`)) ? '.ts' : '.tsx'}`, mocks)
    }
    return require(id)
  }, module, module.exports)
  return module.exports
}

test('Power Plays are disabled in saved settings outside Classic', () => {
  const { DEFAULT_SETUP } = load('types/game.ts')
  const game = new TestRecord({ hostId: 'host' })
  const { useSaveSettings } = load('lib/party/mutations.ts', {
    './client': { useAction: type => require('./helpers/game-rules.cjs').actionFor(type, () => game) },
    '@/lib/avatar': {},
  })
  for (const gameMode of ['classic', 'career', 'h2h', 'higher-lower']) {
    useSaveSettings()({ requesterId: 'host', config: { ...DEFAULT_SETUP, gameMode, powerupsEnabled: true } })
    assert.equal(game.get('powerupsEnabled'), gameMode === 'classic')
  }
  useSaveSettings()({ requesterId: 'host', config: { ...DEFAULT_SETUP, powerupsEnabled: false } })
  assert.equal(game.get('powerupsEnabled'), false)
})

test('help opens by hover, focus and tap, describes every action and dismisses on Escape/outside tap/blur', () => {
  let open = false
  let effect
  const listeners = new Map()
  const originalDocument = global.document
  global.document = { addEventListener: (type, handler) => listeners.set(type, handler), removeEventListener: type => listeners.delete(type) }
  const triggerTarget = {}
  const container = { contains: target => target === triggerTarget }
  const pinned = { current: false }
  const { PowerPlayHelp } = load('components/game/PowerPlayHelp.tsx', {
    react: { ...React, useState: () => [open, value => { open = typeof value === 'function' ? value(open) : value }], useId: () => 'power-help', useRef: initial => initial === false ? pinned : ({ current: container }), useEffect: callback => { effect = callback } },
  })
  const render = () => {
    const tree = PowerPlayHelp()
    return { tree, button: tree.props.children[0], panel: tree.props.children[1] }
  }
  try {
    let view = render()
    assert.equal(view.button.props['aria-expanded'], false)
    view.tree.props.onMouseEnter()
    view = render()
    assert.equal(view.button.props['aria-expanded'], true)
    view.button.props.onClick()
    assert.ok(render().panel, 'click after hover must keep the help open')
    assert.equal(view.button.props['aria-describedby'], view.panel.props.id)
    const markup = renderToStaticMarkup(view.panel)
    for (const text of ['Cut', 'Double Down', 'Freeze', 'Rush', 'Multiple choice only', 'Column-by-column reveals only', 'One use of each per player, per game', 'answer timer keeps running']) assert.ok(markup.includes(text), text)
    const cleanup = effect()
    listeners.get('keydown')({ key: 'Escape' })
    assert.equal(render().panel, false)
    view = render()
    view.button.props.onClick()
    assert.ok(render().panel, 'tap opens the help')
    listeners.get('pointerdown')({ target: triggerTarget })
    assert.ok(render().panel, 'interacting inside keeps help open')
    listeners.get('pointerdown')({ target: {} })
    assert.equal(render().panel, false)
    render().button.props.onFocus({ currentTarget: { matches: () => true } })
    assert.ok(render().panel, 'keyboard focus opens the help')
    render().tree.props.onBlur({ currentTarget: container, relatedTarget: null })
    assert.equal(render().panel, false)
    render().tree.props.onMouseEnter()
    render().tree.props.onMouseLeave()
    assert.equal(render().panel, false)
    cleanup()
    assert.equal(listeners.size, 0)
  } finally { global.document = originalDocument }
})

test('in-game actions have descriptive names, remaining uses and format requirements', () => {
  const Div = props => React.createElement('div', null, props.children)
  const { PowerupBar } = load('components/game/PowerupBar.tsx', {
    '@/components/design-system': { Button: Div, Modal: Div, MonoLabel: Div },
  })
  const markup = renderToStaticMarkup(React.createElement(PowerupBar, {
    charges: { eliminate: 1, doubledown: 1, freeze: 1, extrahint: 0 },
    answerMode: 'freetext', revealMode: 'instant', command: 'answering', onActivate: () => {},
  }))
  assert.match(markup, /aria-label="About Power Plays"/)
  assert.match(markup, /aria-label="Cut: Remove two wrong answers for you\. 1 use remaining\. Multiple choice only\./)
  assert.match(markup, /title="Freeze: Stop further stat columns revealing for everyone\. The answer timer keeps running\./)
  assert.match(markup, /0 uses remaining\. Column-by-column reveals only\./)
})
