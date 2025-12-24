const { TextDecoder, TextEncoder } = require('@exodus/bytes/encoding.js')
const { test, describe } = require('node:test')

// TODO: what's up with Deno on cjs test files?

let vm
try {
  vm = require('node:vm')
} catch {}

describe('vm', { skip: !vm }, () => {
  const string = 'Hello, \u2200'
  const u = Uint8Array.of(0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x2c, 0x20, 0xe2, 0x88, 0x80)
  const ctx = { TextDecoder, TextEncoder }

  test('TextEncoder', (t) => {
    const outer = new TextEncoder().encode(string)
    const inner = vm.runInNewContext(`new TextEncoder().encode(${JSON.stringify(string)})`, ctx)
    t.assert.deepStrictEqual(outer, u)
    t.assert.deepStrictEqual(inner, u)
  })

  test('TextDecoder + Uint8Array', (t) => {
    const outer = new TextDecoder().decode(u)
    const inner = vm.runInNewContext(`new TextDecoder().decode(Uint8Array.of(${u.join(',')}))`, ctx)
    t.assert.deepStrictEqual(outer, string)
    t.assert.deepStrictEqual(inner, string)
  })

  test('TextDecoder + ArrayBuffer', (t) => {
    const outer = new TextDecoder().decode(u.buffer)
    const inner = vm.runInNewContext(
      `new TextDecoder().decode(Uint8Array.of(${u.join(',')}).buffer)`,
      ctx
    )
    t.assert.deepStrictEqual(outer, string)
    t.assert.deepStrictEqual(inner, string)
  })
})
