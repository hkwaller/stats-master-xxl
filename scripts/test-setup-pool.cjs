const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
function load(file, mocks = {}) {
  const module = { exports: {} }
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  new Function('require', 'module', 'exports', source)(id => id in mocks ? mocks[id] : id.startsWith('@/') ? load(`${id.slice(2)}.ts`, mocks) : require(id), module, module.exports)
  return module.exports
}
const { selectCareerCandidates } = load('lib/game/career-pool.ts')
const pool = [
  { playerId: 1, seasons: 10, bestPoints: 150, eras: ['1980s', '1990s'] },
  { playerId: 2, seasons: 5, bestPoints: 120, eras: ['1990s'] },
  { playerId: 3, seasons: 7, bestPoints: 100, eras: ['2000s'] },
  { playerId: 4, seasons: 3, bestPoints: 70, eras: ['1990s'] },
  { playerId: 5, seasons: 20, bestPoints: 69, eras: ['1990s'] },
]
const config = { gameMode: 'career', careerMinSeasons: 3, eras: ['1990s'], difficultyTiers: ['easy', 'medium', 'hard', 'expert'], rookiesOnly: false }
test('career filters handle minimum boundaries, peak tiers, eras, exclusions and empty selections', () => {
  const options = { minSeasons: 3, eras: config.eras, difficultyTiers: config.difficultyTiers }
  assert.deepEqual(selectCareerCandidates(pool, options), [1, 2, 4])
  assert.deepEqual(selectCareerCandidates(pool, { ...options, minSeasons: 5 }), [1, 2])
  assert.deepEqual(selectCareerCandidates(pool, { ...options, minSeasons: 7 }), [1])
  assert.deepEqual(selectCareerCandidates(pool, { ...options, minSeasons: 11 }), [])
  assert.deepEqual(selectCareerCandidates(pool, { ...options, difficultyTiers: ['easy', 'expert'] }), [1, 4])
  assert.deepEqual(selectCareerCandidates(pool, { ...options, eras: ['2000s'] }), [3])
  assert.deepEqual(selectCareerCandidates(pool, { ...options, eras: ['1980s', '1990s'] }), [1, 2, 4])
  assert.deepEqual(selectCareerCandidates(pool, { ...options, difficultyTiers: [] }), [])
  assert.deepEqual(selectCareerCandidates(pool, { ...options, eras: [] }), [])
  assert.deepEqual(selectCareerCandidates(pool, { ...options, excludePlayerIds: [1, 4] }), [2])
  assert.equal(selectCareerCandidates(pool, { minSeasons: 3 }).length, 5)
})
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }

// A deterministic hook runner: retain state and effect dependencies across actual production-hook renders.
function harness() {
  const states = [], effects = [], pending = [], requests = [], loads = []
  let index = 0, effectIndex = 0, current = { ...config }, result
  const originals = { window: global.window, localStorage: global.localStorage }
  const listeners = new Map()
  let stored = '[]'
  global.window = { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) }
  global.localStorage = { getItem: () => stored }
  const { useSetupPool } = load('hooks/useSetupPool.ts', {
    react: {
      useState: initial => { const i = index++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value }] },
      useEffect: (fn, deps) => { const i = effectIndex++; const previous = effects[i]; if (!previous || deps.some((dep, n) => !Object.is(dep, previous.deps[n]))) { previous?.cleanup?.(); effects[i] = { deps }; pending.push(() => { effects[i].cleanup = fn() }) } },
    },
    '@/app/actions/game-actions': {
      loadCareerPool: () => { const job = deferred(); loads.push(job); return job.promise },
      checkAvailableCount: (...args) => { const job = deferred(); requests.push({ ...job, args }); return job.promise },
    },
  })
  function render(patch = {}) { current = { ...current, ...patch }; index = effectIndex = 0; result = useSetupPool(current); pending.splice(0).forEach(fn => fn()); return result }
  return { render, loads, requests, async flush() { await Promise.resolve(); await Promise.resolve(); return render() }, storage(value) { stored = value; listeners.get('storage')() }, close() { effects.forEach(effect => effect.cleanup?.()); Object.assign(global, originals) } }
}
test('career count updates in the same render for every eligibility setting with one metadata request', async () => {
  const h = harness()
  try {
    assert.equal(h.render().loading, true)
    h.loads[0].resolve(pool)
    assert.equal((await h.flush()).count, 3)
    assert.equal(h.render({ careerMinSeasons: 5 }).count, 2)
    assert.equal(h.render({ difficultyTiers: ['easy'] }).count, 1)
    assert.equal(h.render({ eras: ['2000s'] }).count, 0)
    assert.equal(h.render({ eras: [] }).count, 0)
    assert.equal(h.render({ eras: ['1990s'], difficultyTiers: [] }).count, 0)
    assert.equal(h.render({ difficultyTiers: ['easy'], questionCount: 20, answerMode: 'freetext', powerupsEnabled: true }).count, 1)
    h.storage('[1]')
    assert.equal(h.render().count, 0)
    h.storage('invalid json')
    assert.equal(h.render().count, 1)
    assert.equal(h.loads.length, 1)
    assert.equal(h.requests.length, 0)
  } finally { h.close() }
})
test('a delayed career response uses the latest settings; failed loads recover on retry', async () => {
  const h = harness()
  try {
    h.render()
    h.render({ difficultyTiers: ['medium'], careerMinSeasons: 5 })
    h.loads[0].reject(new Error('offline'))
    const failed = await h.flush()
    assert.equal(failed.error, true)
    assert.equal(failed.loading, false)
    failed.retry(); h.render()
    h.loads[1].resolve(pool)
    assert.equal((await h.flush()).count, 1)
    assert.equal(h.render({ difficultyTiers: ['easy', 'medium'] }).count, 2)
  } finally { h.close() }
})
test('remote modes never display stale counts, accept out-of-order responses, or use stale failures', async () => {
  const h = harness()
  try {
    h.render({ gameMode: 'classic' })
    h.requests[0].resolve(10)
    assert.equal((await h.flush()).count, 10)
    assert.equal(h.render({ eras: ['1980s'] }).count, null)
    assert.equal(h.render({ eras: ['2000s'] }).loading, true)
    h.requests[2].resolve(25)
    assert.equal((await h.flush()).count, 25)
    h.requests[1].reject(new Error('old request'))
    const latest = await h.flush()
    assert.equal(latest.count, 25)
    assert.equal(latest.error, false)
    assert.equal(h.render({ difficultyTiers: [] }).count, 0)
    assert.equal(h.render({ gameMode: 'career', difficultyTiers: ['easy'] }).count, null)
    h.loads[0].resolve(pool)
    assert.equal((await h.flush()).count, 0)
  } finally { h.close() }
})
