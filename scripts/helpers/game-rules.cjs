// Existing UI regressions exercise the real draft rules without mounting React.
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const root = path.resolve(__dirname, '../..')
const cache = new Map()
function load(file) {
  if (cache.has(file)) return cache.get(file)
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', source)(
    (id) => {
      if (id.startsWith('.')) return load(path.resolve(path.dirname(file), `${id}.ts`))
      return require(id)
    },
    module,
    module.exports,
  )
  cache.set(file, module.exports)
  return module.exports
}
class TestList extends Array {
  constructor(values = []) {
    super()
    this.push(...values)
  }
  static get [Symbol.species]() {
    return Array
  }
  get(index) {
    return this[index]
  }
  set(index, value) {
    this[index] = value
  }
}
class TestRecord {
  constructor(values) {
    this.values = values
  }
  get(key) {
    return this.values[key]
  }
  set(key, value) {
    this.values[key] = value
  }
  update(values) {
    Object.assign(this.values, values)
  }
  toImmutable() {
    return JSON.parse(JSON.stringify(this.values))
  }
}
function actionFor(type, getGame) {
  return (args) => {
    const game = getGame()
    const draft = new Proxy(
      {},
      {
        get: (_, key) => game.get(key),
        set: (_, key, value) => {
          game.set(key, value)
          return true
        },
      },
    )
    load(path.join(root, 'lib/party/rules.ts')).mutations[type](draft, args)
  }
}
module.exports = { TestList, TestRecord, actionFor }
