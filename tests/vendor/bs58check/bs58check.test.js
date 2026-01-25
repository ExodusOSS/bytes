// Based on https://github.com/bitcoinjs/bs58check/tree/master/test

import * as auto from '@exodus/bytes/base58check.js'
import * as js from '../../../base58check.js'
import { toHex as bytesToHex, fromHex as hexToBytes } from '@exodus/bytes/hex.js'
import { test } from 'node:test'
import fixtures from './fixtures.cjs'

const SharedArrayBuffer = globalThis.SharedArrayBuffer ?? ArrayBuffer
const toShared = (u8) => {
  const res = new Uint8Array(new SharedArrayBuffer(u8.length))
  res.set(u8)
  return res
}

const libs = [auto]
if (js.toBase58check !== auto.toBase58check) libs.push(js)

for (const f of fixtures.valid) {
  test(`decodes ${f.string}`, async (t) => {
    for (const lib of libs) {
      t.assert.strictEqual(bytesToHex(await lib.fromBase58check(f.string)), f.payload)
      t.assert.strictEqual(bytesToHex(lib.fromBase58checkSync(f.string)), f.payload)
    }
  })
}

for (const f of fixtures.invalid) {
  test(`decode throws on ${f.string}`, async (t) => {
    const ex =
      f.exception === 'Non-base58 character' ? 'Invalid character in base58 input' : f.exception
    for (const lib of libs) {
      await t.assert.rejects(async () => lib.fromBase58check(f.string), new RegExp(ex))
      t.assert.throws(() => lib.fromBase58checkSync(f.string), new RegExp(ex))
    }
  })
}

for (const f of fixtures.valid) {
  test(`encodes ${f.string}`, async (t) => {
    const u8 = hexToBytes(f.payload)
    const buffer = Buffer.from(u8)
    for (const lib of libs) {
      t.assert.strictEqual(await lib.toBase58check(u8), f.string)
      t.assert.strictEqual(await lib.toBase58check(buffer), f.string)
      t.assert.strictEqual(await lib.toBase58check(toShared(u8)), f.string)
      t.assert.strictEqual(lib.toBase58checkSync(u8), f.string)
      t.assert.strictEqual(lib.toBase58checkSync(buffer), f.string)
      t.assert.strictEqual(lib.toBase58checkSync(toShared(u8)), f.string)
    }
  })
}
