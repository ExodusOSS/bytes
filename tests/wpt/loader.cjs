const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { describe, test } = require('node:test')

globalThis.test = (f, name) => test(name, f)
globalThis.subsetTest = (t, ...a) => t(...a)
globalThis.assert_equals = assert.strictEqual
globalThis.assert_true = (x, ...r) => assert.strictEqual(x, true, ...r)
globalThis.assert_false = (x, ...r) => assert.strictEqual(x, false, ...r)
globalThis.assert_throws_js = (e, f) => assert.throws(f, e)
globalThis.assert_array_equals = (a, b) => {
  assert.strictEqual(a.length, b.length)
  assert.deepStrictEqual([...a], [...b])
}

globalThis.createBuffer = (type, length, opts) => new ArrayBuffer(length, opts) // we don't bother with SharedArrayBuffer in WPT tests

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
