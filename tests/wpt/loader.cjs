const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { describe, test } = require('node:test')
const { createMultibyteEncoder } = require('@exodus/bytes/multi-byte.js')

// TextDecoderStream / TextEncoderStream implementations expect Streams to be present
if (!globalThis.ReadableStream) {
  const { ReadableStream, WritableStream, TransformStream } = require('web-streams-polyfill')
  Object.assign(globalThis, { ReadableStream, WritableStream, TransformStream })
}

// Older but supported Node.js versions don't have Float16Array which is used in some tests
if (!globalThis.Float16Array) {
  const { Float16Array } = require('@petamoriken/float16')
  Object.assign(globalThis, { Float16Array })
}

// MessageChannel is used to test detached ArrayBuffer instances
// We can polyfill that on modern barebone engines except Hermes
if (!globalThis.MessageChannel && ArrayBuffer.prototype.transfer) {
  const MessageChannel = class {
    port1 = { postMessage: (_, transfer = []) => transfer.forEach((x) => x.transfer()) }
  }
  Object.assign(globalThis, { MessageChannel })
}

globalThis.self = globalThis

globalThis.setup = (f) => f()
globalThis.describe = (f, name) => describe(name, f)
globalThis.test = (f, name) => test(name, f)
globalThis.promise_test = (f, name) => test(name, { timeout: 20_000 }, f)
globalThis.subsetTest = (t, ...a) => t(...a)
globalThis.generate_tests = (t, l) => {
  describe('generate_tests', () => {
    l.forEach(([n, ...r]) => test(n, () => t(...r)))
  })
}

globalThis.format_value = (x) => JSON.stringify(x)
globalThis.step_timeout = setTimeout
globalThis.assert_equals = assert.strictEqual
globalThis.assert_true = (x, ...r) => assert.strictEqual(x, true, ...r)
globalThis.assert_false = (x, ...r) => assert.strictEqual(x, false, ...r)
globalThis.assert_not_equals = (a, b, ...r) => assert.notEqual(a, b, ...r)
globalThis.assert_throws_js = (e, f, m) => assert.throws(f, e, m)
globalThis.assert_throws_dom = (e, f, m) => assert.throws(f, Error, m) // we don't care about exact dom errors
globalThis.promise_rejects_js = (t, e, p, m) => assert.rejects(p, e, m)
globalThis.promise_rejects_exactly = (t, e, p, m) => assert.rejects(p, (x) => x === e, m)
globalThis.assert_array_equals = (a, b, m) => {
  assert.strictEqual(a.length, b.length, m)
  assert.deepStrictEqual([...a], [...b], m)
}

// wpt/encoding/streams/resources/readable-stream-from-array.js
function readableStreamFromArray(array) {
  return new ReadableStream({
    start(controller) {
      for (const entry of array) {
        controller.enqueue(entry)
      }

      controller.close()
    },
  })
}

// wpt/encoding/streams/resources/readable-stream-to-array.js
function readableStreamToArray(stream) {
  var array = []
  var writable = new WritableStream({
    write(chunk) {
      array.push(chunk)
    },
  })
  return stream.pipeTo(writable).then(() => array)
}

Object.assign(globalThis, { readableStreamFromArray, readableStreamToArray })

globalThis.createBuffer = (type, length, opts) => {
  if (type === 'SharedArrayBuffer' && globalThis.SharedArrayBuffer) {
    return new SharedArrayBuffer(length, opts)
  }

  return new ArrayBuffer(length, opts)
}

globalThis.encodings_table = require('../encoding/fixtures/encodings.json')

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
    const encode =
      decoder.encoding === 'iso-2022-jp' ? null : createMultibyteEncoder(decoder.encoding) // TODO: iso-2022-jp

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
          (['euc-jp', 'shift_jis'].includes(decoder.encoding) &&
            [0xa5, 0x20_3e, 0x22_12].includes(cp)) ||
          (decoder.encoding === 'iso-2022-jp' && cp === 0x22_12)
        ) {
          // Those three encodings are asymmetrical on these codepoints
          // See https://encoding.spec.whatwg.org/ for mentions of those exact code points
          // So, skip testing decoder on those
          // E.g., test data includes: <span data-cp="A5" data-bytes="5C">
          // But browsers (and spec) decode 5C as ASCII superset, to 0x5C codepoint
        } else {
          const expected = String.fromCodePoint(cp)
          t.assert.strictEqual(decoder.decode(bytes), expected, `${bytesHex} => U+${cpHex}`)
          t.assert.strictEqual(fatal.decode(bytes), expected, `${bytesHex} => U+${cpHex}`)
        }

        // Test encoder
        // This is limited, encoders are asymmetrical
        if (
          !(decoder.encoding === 'euc-jp' && bytes.length === 3) && // no jis0212 encoding in spec
          !(decoder.encoding === 'big5' && bytes[0] > 0x7f && bytes[0] <= 0xa0) && // encoding excludes pointers less than (0xA1 - 0x81) × 157.
          decoder.encoding !== 'iso-2022-jp' // Not implemented yet
        ) {
          t.assert.doesNotThrow(
            () => t.assert.deepEqual(encode(String.fromCodePoint(cp)), bytes),
            `encode U+${cpHex} => ${bytesHex}`
          )
        }

        tested++
      }

      t.assert.ok(tested > 0)
      t.assert.ok(b.length - pos < 50, b.length - pos) // we reached the end
    }
  })
}

module.exports = { loadFile, loadDir }
