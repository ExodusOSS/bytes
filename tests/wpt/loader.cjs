const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { describe, test } = require('node:test')

globalThis.self = globalThis

globalThis.setup = (f) => f()
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
  for (const fileName of fs.readdirSync(dir)) {
    if (fileName === 'resources') continue
    if (fileName.endsWith('.headers')) continue
    if (
      fileName.endsWith('.html') &&
      (fileName.includes('_chars') || fileName.includes('_errors'))
    ) {
      loadTextDecoderHtml(path.join(dirName, fileName))
    } else if (fileName.includes('.')) {
      loadFile(path.join(dirName, fileName))
    } else {
      loadDir(path.join(dirName, fileName))
    }
  }
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

function loadTextDecoderHtml(fullName) {
  assert(fullName.endsWith('.html'))
  const name = fullName.replace(/\.html$/, '')
  const heads = [
    '<!doctype html><html><head><meta charset="',
    '<!doctype html>\n<html>\n<head>\n<meta charset="',
    '<!doctype html>\r\n<html>\r\n<head>\r\n<meta charset="', // e.g. git autocrlf, GitHub CI on Windows
  ]

  test(fullName, (t) => {
    const b = fs.readFileSync(path.join(__dirname, `fixtures/${name}.html`)) // do not parse to text, read as Buffer
    let encoding
    for (const head of heads) {
      if (!Buffer.from(b.subarray(0, head.length)).equals(Buffer.from(head))) continue
      const end = b.indexOf('"', head.length)
      assert.ok(end >= 0)
      const encodingBuf = Buffer.from(b.subarray(head.length, end))
      assert.ok(encodingBuf.length > 0 && encodingBuf.every((x) => x < 128)) // we found encoding and it's ASCII
      encoding = encodingBuf.toString()
    }

    assert.ok(encoding && encoding.length > 0)
    const decoder = new globalThis.TextDecoder(encoding)
    const fatal = new globalThis.TextDecoder(encoding, { fatal: true })

    if (fullName.endsWith('_errors.html')) {
      const sep0 = '<span>'
      const sep1 = '</span>'
      let pos = 0
      let tested = 0
      while (true) {
        const start = b.indexOf(sep0, pos)
        if (start === -1) break // only clean exit path
        const end = b.indexOf(sep1, start + sep0.length)
        t.assert.ok(end >= start)
        const bytes = b.subarray(start + sep0.length, end)
        pos = end + sep1.length

        // Test decoder!
        t.assert.ok(decoder.decode(bytes).includes('\uFFFD')) // replacement
        t.assert.throws(() => fatal.decode(bytes))
        tested++
      }

      t.assert.ok(tested > 0)
      t.assert.ok(b.length - pos < 50, b.length - pos) // we reached the end
    } else {
      const dCp = 'data-cp="'
      const dBytes = ' data-bytes="'

      let pos = 0
      let tested = 0
      while (true) {
        const cpStart = b.indexOf(dCp, pos)
        if (cpStart === -1) break // only clean exit path
        const cpEnd = b.indexOf('"', cpStart + dCp.length)
        t.assert.ok(cpEnd > cpStart)
        const bytesStart = cpEnd + 1 // always, asserted
        const separatorBuf = Buffer.from(b.subarray(bytesStart, bytesStart + dBytes.length))
        t.assert.ok(separatorBuf.equals(Buffer.from(dBytes)))
        const bytesEnd = b.indexOf('"', bytesStart + dBytes.length)
        t.assert.ok(bytesEnd > bytesStart)
        pos = bytesEnd + 1 // for " length

        const cpBuf = Buffer.from(b.subarray(cpStart + dCp.length, cpEnd))
        const bytesBuf = Buffer.from(b.subarray(bytesStart + dBytes.length, bytesEnd))
        assert.ok(cpBuf.length > 0 && cpBuf.every((x) => x < 128)) // ASCII
        assert.ok(bytesBuf.length > 0 && bytesBuf.every((x) => x < 128)) // ASCII
        const cpHex = cpBuf.toString()
        const bytesHex = Buffer.from(bytesBuf.filter((x) => x !== 0x20)).toString() // skip spaces
        const cp = parseInt(cpHex, 16)
        const bytes = Buffer.from(bytesHex, 'hex')

        // Ensure that we parsed strings correct, parseInt / Buffer.from are loose
        t.assert.strictEqual(cp.toString(16).toUpperCase(), cpHex)
        t.assert.strictEqual(bytes.toString('hex').toUpperCase(), bytesHex)

        // Test decoder!
        if (
          ['euc-jp', 'iso-2022-jp', 'shift_jis'].includes(decoder.encoding) &&
          [0xa5, 0x20_3e, 0x22_12].includes(cp)
        ) {
          // Those three encodings are assymetrical on these codepoints
          // See https://encoding.spec.whatwg.org/ for mentions of those exact code points
          // So, skip testing decoder on those
          // E.g., test data includes: <span data-cp="A5" data-bytes="5C">
          // But browsers (and spec) decode 5C as ASCII superset, to 0x5C codepoint
        } else {
          const expected = String.fromCodePoint(cp)
          t.assert.strictEqual(decoder.decode(bytes), expected, `${bytesHex} => U+${cpHex}`)
          t.assert.strictEqual(fatal.decode(bytes), expected, `${bytesHex} => U+${cpHex}`)
        }

        tested++
      }

      t.assert.ok(tested > 0)
      t.assert.ok(b.length - pos < 50, b.length - pos) // we reached the end
    }
  })
}

module.exports = { loadFile, loadDir }
