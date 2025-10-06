const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')

globalThis.assert = (...a) => assert(...a)
Object.assign(globalThis.assert, {
  sameValue: assert.strictEqual,
  throws: (e, f, ...r) => assert.throws(f, e, ...r),
  compareArray: (a, b) => {
    assert.strictEqual(a.length, b.length)
    assert.deepStrictEqual([...a], [...b])
  },
})

globalThis.verifyProperty = (o, key, desc) => {
  const real = Object.getOwnPropertyDescriptor(o, key)
  assert.ok(real)
  for (const [k, v] of Object.entries(desc)) {
    assert(Object.hasOwn(real, k), k)
    assert.strictEqual(real[k], v, k)
  }
}

globalThis.Test262Error = class Test262Error extends Error {}

function loadDir(dirName) {
  const dir = path.join(__dirname, 'fixtures', dirName)
  for (const fileName of fs.readdirSync(dir)) {
    if (!fileName.endsWith('.js')) continue
    loadFile(path.join(dirName, fileName))
  }
}

function loadFile(fullName) {
  assert(fullName.endsWith('.js'))
  const name = fullName.replace(/\.js$/, '')
  try {
    const text = fs.readFileSync(path.join(__dirname, `fixtures/${name}.js`), 'utf8')
    const prefix = 'description: '
    const rows = text.slice(0, 2048).replaceAll(': >\n  ', ': ').split('\n')
    const title = rows.find((x) => x.startsWith(prefix))?.slice(prefix.length) ?? fullName
    test(title, () => require(`./fixtures/${name}.js`))
  } catch (e) {
    test(fullName, () => {
      throw e
    })
  }
}

module.exports = { loadFile, loadDir }
