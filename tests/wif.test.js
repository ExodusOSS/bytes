import * as lib from '@exodus/bytes/wif.js'
import { randomValues } from '@exodus/crypto/randomBytes'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as wif from 'wif'

async function fromWifString(str) {
  const a = await lib.fromWifString(str)
  const b = lib.fromWifStringSync(str)
  assert.deepStrictEqual(a, b)
  return a
}

async function toWifString(wif) {
  const a = await lib.toWifString(wif)
  const b = lib.toWifStringSync(wif)
  assert.strictEqual(a, b)
  return a
}

const round = async (wif) => fromWifString(await toWifString(wif))

test('fromWifString matches wif, static data', async (t) => {
  for (const compressed of [false, true]) {
    for (const version of [0, 1, 10, 42, 255]) {
      const zeros = { version, compressed, privateKey: new Uint8Array(32) }
      const ones = { version, compressed, privateKey: new Uint8Array(32).fill(1) }
      const mid = { version, compressed, privateKey: new Uint8Array(32).fill(42) }
      const max = { version, compressed, privateKey: new Uint8Array(32).fill(255) }
      t.assert.strictEqual(await toWifString(zeros), wif.encode(zeros), `[0] x32, v=${version}`)
      t.assert.strictEqual(await toWifString(ones), wif.encode(ones), `[1] x32, v=${version}`)
      t.assert.strictEqual(await toWifString(mid), wif.encode(mid), `[42] x32, v=${version}`)
      t.assert.strictEqual(await toWifString(max), wif.encode(max), `[255] x32, v=${version}`)
    }
  }
})

test('sizes roundtrip, static data', async (t) => {
  for (const compressed of [false, true]) {
    for (const version of [0, 1, 10, 42, 255]) {
      const zeros = { version, compressed, privateKey: new Uint8Array(32) }
      const ones = { version, compressed, privateKey: new Uint8Array(32).fill(1) }
      const mid = { version, compressed, privateKey: new Uint8Array(32).fill(42) }
      const max = { version, compressed, privateKey: new Uint8Array(32).fill(255) }
      t.assert.deepStrictEqual(await round(zeros), zeros, `[0] x32, v=${version}`)
      t.assert.deepStrictEqual(await round(ones), ones, `[1] x32, v=${version}`)
      t.assert.deepStrictEqual(await round(mid), mid, `[42] x32, v=${version}`)
      t.assert.deepStrictEqual(await round(max), max, `[255] x32, v=${version}`)
    }
  }
})

test('toWifString matches wif, random data', async (t) => {
  const seed = randomValues(300)
  for (const compressed of [false, true]) {
    for (const version of [0, 1, 10, 42, 255]) {
      for (let start = 0; start < seed.length - 32; start++) {
        const x = { version, compressed, privateKey: seed.subarray(start, start + 32) }
        t.assert.strictEqual(await toWifString(x), wif.encode(x), `random, v=${version}`)
      }
    }
  }
})

test('sizes roundtrip, random data', async (t) => {
  const seed = randomValues(300)
  for (const compressed of [false, true]) {
    for (const version of [0, 1, 10, 42, 255]) {
      for (let start = 0; start < seed.length - 32; start++) {
        const x = { version, compressed, privateKey: seed.subarray(start, start + 32) }
        t.assert.deepStrictEqual(await round(x), x, `random, v=${version}`)
      }
    }
  }
})
