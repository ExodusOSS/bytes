const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { describe, test } = require('node:test')

globalThis.describe = (f, name) => describe(name, f)
globalThis.test = (f, name) => test(name, f)
globalThis.subsetTest = (t, ...a) => t(...a)
globalThis.generate_tests = (t, l) => {
  describe('generate_tests', () => {
    l.forEach(([n, ...r]) => test(n, () => t(...r)))
  })
}

globalThis.assert_equals = assert.strictEqual
globalThis.format_value = (x) => JSON.stringify(x)
globalThis.assert_true = (x, ...r) => assert.strictEqual(x, true, ...r)
globalThis.assert_false = (x, ...r) => assert.strictEqual(x, false, ...r)
globalThis.assert_not_equals = (a, b, ...r) => assert.notEqual(a, b, ...r)
globalThis.assert_throws_js = (e, f, m) => assert.throws(f, e, m)
globalThis.assert_throws_dom = (e, f, m) => assert.throws(f, Error, m) // we don't care about exact dom errors
globalThis.assert_array_equals = (a, b) => {
  assert.strictEqual(a.length, b.length)
  assert.deepStrictEqual([...a], [...b])
}

globalThis.createBuffer = (type, length, opts) => new ArrayBuffer(length, opts) // we don't bother with SharedArrayBuffer in WPT tests
globalThis.encodings_table = require('../fixtures/encodings/encodings.json')

function loadDir(dirName) {
  const dir = path.join(__dirname, 'fixtures', dirName)
  for (const fileName of fs.readdirSync(dir)) loadFile(path.join(dirName, fileName))
}

function loadFile(fullName) {
  assert(fullName.endsWith('.js'))
  const name = fullName.replace(/\.js$/, '')
  try {
    const text = fs.readFileSync(path.join(__dirname, `fixtures/${name}.js`), 'utf8')
    const prefix = '// META: title='
    const rows = text.slice(0, 2048).split('\n')
    const title = rows.find((x) => x.startsWith(prefix))?.slice(prefix.length) ?? fullName
    describe(title, () => require(`./fixtures/${name}.js`))
  } catch (e) {
    test(fullName, () => {
      throw e
    })
  }
}

module.exports = { loadFile, loadDir }
