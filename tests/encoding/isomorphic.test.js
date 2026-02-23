import { isomorphicDecode, isomorphicEncode } from '@exodus/bytes/encoding.js'
import { test } from 'node:test'

const SharedArrayBuffer = globalThis.SharedArrayBuffer ?? ArrayBuffer
const toShared = (u8) => {
  const res = new Uint8Array(new SharedArrayBuffer(u8.length))
  res.set(u8)
  return res
}

test('isomorphic works on U+0000 - U+00FF', (t) => {
  for (let i = 0; i < 256; i++) {
    const str = isomorphicDecode(Uint8Array.of(i))
    t.assert.strictEqual(str.length, 1, i)
    t.assert.strictEqual(str.codePointAt(0), i, i)
    t.assert.strictEqual(isomorphicDecode(toShared(Uint8Array.of(i))), str)
    t.assert.deepStrictEqual(isomorphicEncode(str), Uint8Array.of(i))
  }
})

test('input types', (t) => {
  const u8 = new Uint8Array(256).map((_, i) => i)
  const str = String.fromCodePoint(...u8)
  t.assert.deepStrictEqual(isomorphicEncode(str), u8)
  for (const arg of [
    u8,
    u8.buffer,
    new Int8Array(u8.buffer),
    new Uint16Array(u8.buffer),
    new Int32Array(u8.buffer),
    toShared(u8),
    toShared(u8).buffer,
  ]) {
    t.assert.deepStrictEqual(isomorphicDecode(arg), str)
  }

  for (const arg of ['', [], [...u8], null, undefined, {}, { ...u8 }]) {
    t.assert.throws(() => isomorphicDecode(arg))
  }
})

test('isomorphic throws on codepoints above U+00FF', (t) => {
  for (let i = 256; i < 1024; i++) {
    t.assert.throws(() => isomorphicEncode(String.fromCodePoint(i)))
  }

  for (let i = 0xff_00; i < 0x1_02_00; i++) {
    t.assert.throws(() => isomorphicEncode(String.fromCodePoint(i)))
  }
})

test('isomorphic throws on surrogates', (t) => {
  for (let i = 0xd8_00; i < 0xe0_00; i++) {
    t.assert.throws(() => isomorphicEncode(String.fromCharCode(i)))
  }
})
