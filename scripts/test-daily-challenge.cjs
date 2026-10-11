const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

function loadActions(supabase) {
  const source = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '../app/actions/daily-challenge-actions.ts'), 'utf8'),
    { compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS } },
  ).outputText
  const module = { exports: {} }
  const mocks = {
    '@clerk/nextjs/server': { auth: async () => ({ userId: 'test-user' }) },
    '@/lib/supabase/server': { createSupabaseClient: () => supabase },
    './game-actions': { getTodayDateString: async () => '2026-10-11' },
  }
  new Function('require', 'module', 'exports', source)(id => mocks[id], module, module.exports)
  return module.exports
}

test('saved answers are loaded using the resolved UTC date', async () => {
  const filters = {}
  const record = { challenge_date: '2026-10-11', question_id: '42', is_correct: true }
  const query = {
    select: () => query,
    eq: (key, value) => { filters[key] = value; return query },
    maybeSingle: async () => ({ data: record, error: null }),
  }
  const actions = loadActions({ from: () => query })
  assert.deepEqual(await actions.getMyDailyChallengeScore(), record)
  assert.equal(filters.user_id, 'test-user')
  assert.equal(filters.challenge_date, '2026-10-11')
})

test('answers are saved under the resolved UTC date with duplicate protection', async () => {
  let saved, options
  const actions = loadActions({ from: () => ({
    upsert: async (row, config) => {
      saved = row
      options = config
      return { error: null }
    },
  }) })
  assert.deepEqual(await actions.saveDailyChallengeScore({ questionId: '42', isCorrect: true }), { ok: true })
  assert.equal(saved.challenge_date, '2026-10-11')
  assert.equal(saved.user_id, 'test-user')
  assert.equal(saved.question_id, '42')
  assert.equal(saved.is_correct, true)
  assert.deepEqual(options, { onConflict: 'user_id,challenge_date', ignoreDuplicates: true })
})
