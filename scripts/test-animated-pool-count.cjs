const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

function harness(reduced = false) {
  const originalWindow = global.window
  const node = { textContent: '' },
    refs = [{ current: node }, { current: 0 }],
    jobs = []
  let refIndex = 0,
    effect,
    cleanup,
    listener
  const media = {
    matches: reduced,
    addEventListener: (_, fn) => {
      listener = fn
    },
    removeEventListener: () => {
      listener = undefined
    },
  }
  global.window = { matchMedia: () => media }
  const module = { exports: {} }
  const source = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '../components/game/AnimatedPoolCount.tsx'), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText
  new Function('require', 'module', 'exports', source)(
    (id) => {
      if (id === 'react')
        return {
          useRef: initial => { const i = refIndex++; return refs[i] ?? (refs[i] = { current: initial }) },
          useEffect: (fn) => {
            effect = fn
          },
        }
      if (id === 'framer-motion')
        return {
          animate: (from, to, options) => {
            const job = {
              from,
              to,
              options,
              stopped: false,
              stop() {
                this.stopped = true
              },
            }
            jobs.push(job)
            return job
          },
        }
      return require(id)
    },
    module,
    module.exports,
  )
  return {
    node,
    jobs,
    render(count) {
      cleanup?.()
      refIndex = 0
      const markup = renderToStaticMarkup(
        React.createElement(module.exports.AnimatedPoolCount, { count }),
      )
      // Model React's text reconciliation: unchanged JSX children preserve imperative animation text.
      const child = markup.match(/class="setup-pool-number[^"]*">([^<]*)</)[1]
      if (child !== this.previousChild) node.textContent = child
      this.previousChild = child
      cleanup = effect()
      return markup
    },
    reduce() {
      media.matches = true
      listener()
    },
    close() {
      cleanup?.()
      global.window = originalWindow
    },
  }
}

test('counts up through intermediate values while exposing the exact target accessibly', () => {
  const h = harness()
  try {
    const markup = h.render(1234)
    assert.match(markup, /aria-hidden="true"/)
    assert.match(markup, /class="sr-only">1,234/)
    const job = h.jobs[0]
    assert.equal(job.from, 0)
    assert.equal(job.to, 1234)
    job.options.onUpdate(617.2)
    assert.equal(h.node.textContent, '617')
    job.options.onComplete()
    assert.equal(h.node.textContent, '1,234')
  } finally {
    h.close()
  }
})
test('rapid changes interrupt the old animation and count down from the visible value, including zero', () => {
  const h = harness()
  try {
    h.render(1000)
    h.jobs[0].options.onUpdate(720)
    h.render(100)
    assert.equal(h.jobs[0].stopped, true)
    assert.equal(h.jobs[1].from, 720)
    assert.equal(h.jobs[1].to, 100)
    h.jobs[1].options.onUpdate(400)
    h.render(0)
    assert.equal(h.jobs[1].stopped, true)
    assert.equal(h.jobs[2].from, 400)
    h.jobs[2].options.onComplete()
    assert.equal(h.node.textContent, '0')
  } finally {
    h.close()
  }
})
test('Classic recalculation keeps the displayed number and resumes from it when the request resolves', () => {
  const h = harness()
  try {
    h.render(1000)
    h.jobs[0].options.onUpdate(720)
    h.render(null)
    assert.equal(h.node.textContent, '720', 'loading must not replace the number with a dash')
    assert.equal(h.jobs[0].stopped, true)
    assert.equal(h.jobs.length, 1)
    h.render(300)
    assert.equal(h.jobs[1].from, 720)
    h.jobs[1].options.onComplete()
    assert.equal(h.node.textContent, '300')
  } finally { h.close() }
})
test('first load has a placeholder, and a settled zero survives subsequent loading', () => {
  const h = harness()
  try {
    h.render(null)
    assert.equal(h.node.textContent, '-')
    h.render(0)
    h.jobs[0].options.onComplete()
    h.render(null)
    assert.equal(h.node.textContent, '0')
  } finally { h.close() }
})
test('reduced motion snaps directly to the count, including when the preference changes mid-animation', () => {
  const h = harness(true)
  try {
    h.render(1234)
    assert.equal(h.jobs.length, 0)
    assert.equal(h.node.textContent, '1,234')
  } finally {
    h.close()
  }
  const moving = harness()
  try {
    moving.render(500)
    moving.jobs[0].options.onUpdate(120)
    moving.reduce()
    assert.equal(moving.jobs[0].stopped, true)
    assert.equal(moving.node.textContent, '500')
  } finally {
    moving.close()
  }
})
