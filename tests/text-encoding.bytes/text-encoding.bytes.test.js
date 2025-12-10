// Comment out this line to test on native impl, e.g. to cross-test in browsers
import { TextDecoder } from '@exodus/bytes/text-encoding.js'

import { toBase64 } from '@exodus/bytes/base64.js'
import { fromHex } from '@exodus/bytes/hex.js'
import { test, describe } from 'node:test'

// import { labels } from './fixtures/encodings/encodings.cjs'
const labels = ['windows-1252', 'utf-8', 'iso-2022-jp', 'shift_jis']

// Try all 1-byte and 2-byte inputs and save the result in a snapshot

function fromBits(str) {
  if (str.length % 8 !== 0) throw new Error('Can not')
  const res = new Uint8Array(str.length / 8)
  for (let i = 0; i < res.length; i++) res[i] = parseInt(str.slice(8 * i, 8 * i + 8), 2)
  return res
}

function fromBase4(str) {
  if (str.length % 4 !== 0) throw new Error('Can not')
  const res = new Uint8Array(str.length / 4)
  for (let i = 0; i < res.length; i++) res[i] = parseInt(str.slice(4 * i, 4 * i + 4), 4)
  return res
}

describe('1-byte snapshot tests', () => {
  for (const label of labels) {
    describe(label, () => {
      const u8 = new Uint8Array(1)
      for (const type of ['ascii', 'non-ascii']) {
        test(type, (t) => {
          const out = []
          const flags = []
          for (let i = 0; i < 256; i++) {
            const isAscii = i < 128
            if (isAscii !== (type === 'ascii')) continue
            u8[0] = i

            // See https://issues.chromium.org/issues/467624168, to cross-test with Chrome we want a clean decoder there
            const loose = new TextDecoder(label)
            const fatal = new TextDecoder(label, { fatal: true })
            const a = loose.decode(u8)
            t.assert.strictEqual(a.length, 1, `Byte: ${i}`)
            let b
            let ok = false
            try {
              b = fatal.decode(u8)
              ok = true
            } catch {}

            if (ok) t.assert.strictEqual(a, b, `Byte: ${i}`)
            const hex = [...a].map((c) => c.codePointAt(0).toString(16).padStart(4, '0')).join('')
            flags.push(ok ? 1 : 0)
            out.push(hex)
          }

          if (t.assert.snapshot) {
            t.assert.snapshot(toBase64(fromBits(flags.join(''))))
            t.assert.snapshot(toBase64(fromHex(out.join(''))))
          } else {
            t.skip('Snapshots are not supported')
          }
        })
      }
    })
  }
})

describe('2-byte snapshot tests', () => {
  for (const label of labels) {
    describe(label, () => {
      const u8 = new Uint8Array(2)
      for (const type of ['ascii', 'non-ascii']) {
        test(type, (t) => {
          const out = []
          const lengths = []
          const flags = []
          for (let i = 0; i < 256; i++) {
            u8[0] = i
            for (let j = 0; j < 256; j++) {
              const isAscii = i < 128 && j < 128
              if (isAscii !== (type === 'ascii')) continue
              u8[1] = j

              // See https://issues.chromium.org/issues/467624168, to cross-test with Chrome we want a clean decoder there
              const loose = new TextDecoder(label)
              const fatal = new TextDecoder(label, { fatal: true })
              const a = loose.decode(u8)
              t.assert.ok(a.length > 0, 1, `Bytes: ${i}, ${j}`)
              let b
              let ok = false
              try {
                b = fatal.decode(u8)
                ok = true
              } catch {}

              if (ok) t.assert.strictEqual(a, b, `Bytes: ${i}, ${j}`)
              const hex = [...a].map((c) => c.codePointAt(0).toString(16).padStart(4, '0')).join('')
              flags.push(ok ? 1 : 0)
              lengths.push(a.length)
              out.push(hex)
            }
          }

          if (t.assert.snapshot) {
            t.assert.snapshot(toBase64(fromBits(flags.join(''))))
            t.assert.snapshot(toBase64(fromBase4(lengths.join('')))) // 1-2
            t.assert.snapshot(toBase64(fromHex(out.join(''))))
          } else {
            t.skip('Snapshots are not supported')
          }
        })
      }
    })
  }
})

describe('3-byte a-b-b snapshot tests', () => {
  for (const label of labels) {
    describe(label, () => {
      const u8 = new Uint8Array(3)
      for (const type of ['ascii', 'non-ascii']) {
        test(type, (t) => {
          const out = []
          const flags = []
          const lengths = []
          for (let i = 0; i < 256; i++) {
            u8[0] = i
            for (let j = 0; j < 256; j++) {
              const isAscii = i < 128 && j < 128
              if (isAscii !== (type === 'ascii')) continue
              u8[1] = u8[2] = j

              // See https://issues.chromium.org/issues/467624168, to cross-test with Chrome we want a clean decoder there
              const loose = new TextDecoder(label)
              const fatal = new TextDecoder(label, { fatal: true })
              const a = loose.decode(u8)
              t.assert.ok(a.length > 0, 1, `Bytes: ${i}, ${j}, ${j}`)
              let b
              let ok = false
              try {
                b = fatal.decode(u8)
                ok = true
              } catch {}

              if (ok) t.assert.strictEqual(a, b, `Bytes: ${i}, ${j}, ${j}`)
              const hex = [...a].map((c) => c.codePointAt(0).toString(16).padStart(4, '0')).join('')
              flags.push(ok ? 1 : 0)
              lengths.push(a.length)
              out.push(hex)
            }
          }

          if (t.assert.snapshot) {
            t.assert.snapshot(toBase64(fromBits(flags.join(''))))
            t.assert.snapshot(toBase64(fromBase4(lengths.join('')))) // 1-3
            t.assert.snapshot(toBase64(fromHex(out.join(''))))
          } else {
            t.skip('Snapshots are not supported')
          }
        })
      }
    })
  }
})

describe('3-byte a-b-a snapshot tests', () => {
  for (const label of labels) {
    describe(label, () => {
      const u8 = new Uint8Array(3)
      for (const type of ['ascii', 'non-ascii']) {
        test(type, (t) => {
          const out = []
          const flags = []
          const lengths = []
          for (let i = 0; i < 256; i++) {
            u8[0] = u8[2] = i
            for (let j = 0; j < 256; j++) {
              const isAscii = i < 128 && j < 128
              if (isAscii !== (type === 'ascii')) continue
              u8[1] = j

              // See https://issues.chromium.org/issues/467624168, to cross-test with Chrome we want a clean decoder there
              const loose = new TextDecoder(label)
              const fatal = new TextDecoder(label, { fatal: true })
              const a = loose.decode(u8)
              t.assert.ok(a.length > 0, 1, `Bytes: ${i}, ${j}, ${j}`)
              let b
              let ok = false
              try {
                b = fatal.decode(u8)
                ok = true
              } catch {}

              if (ok) t.assert.strictEqual(a, b, `Bytes: ${i}, ${j}, ${j}`)
              const hex = [...a].map((c) => c.codePointAt(0).toString(16).padStart(4, '0')).join('')
              flags.push(ok ? 1 : 0)
              lengths.push(a.length)
              out.push(hex)
            }
          }

          if (t.assert.snapshot) {
            t.assert.snapshot(toBase64(fromBits(flags.join(''))))
            t.assert.snapshot(toBase64(fromBase4(lengths.join('')))) // 1-3
            t.assert.snapshot(toBase64(fromHex(out.join(''))))
          } else {
            t.skip('Snapshots are not supported')
          }
        })
      }
    })
  }
})
