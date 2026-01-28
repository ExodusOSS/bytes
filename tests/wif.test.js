import * as lib from '@exodus/bytes/wif.js'
import { randomValues } from '@exodus/crypto/randomBytes'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as wif from 'wif'
import { toBase58checkSync } from '@exodus/bytes/base58check.js'

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

test('invalid array lengths throw before version check', async (t) => {
  // Test that arrays with invalid lengths throw "Invalid WIF length" error
  // BEFORE checking the version, even when expectedVersion is provided.
  // This is a regression test for the bounds check fix.
  //
  // Before fix: For invalid length arrays, arr[0] was read first, then:
  //   - If expectedVersion was provided and didn't match arr[0], threw "Invalid network version"
  //   - Otherwise, threw "Invalid WIF length" later
  // After fix: Length validation happens first, always throwing "Invalid WIF length"
  //   for invalid lengths, regardless of expectedVersion
  
  // Test various invalid lengths
  const invalidLengths = [0, 1, 4, 10, 32, 35, 50]
  
  for (const length of invalidLengths) {
    const arr = new Uint8Array(length).fill(128)
    arr[0] = 42 // Set a specific version byte
    const encoded = toBase58checkSync(arr)
    
    // Without expectedVersion: both old and new throw "Invalid WIF length"
    await t.assert.rejects(
      async () => await lib.fromWifString(encoded),
      { message: 'Invalid WIF length' },
      `fromWifString should reject length ${length} without expectedVersion`
    )
    
    t.assert.throws(
      () => lib.fromWifStringSync(encoded),
      { message: 'Invalid WIF length' },
      `fromWifStringSync should reject length ${length} without expectedVersion`
    )
    
    // With expectedVersion that doesn't match:
    // - Old code would throw "Invalid network version" (after reading arr[0])
    // - New code throws "Invalid WIF length" (before reading arr[0])
    const wrongVersion = 99 // Different from arr[0] which is 42
    
    await t.assert.rejects(
      async () => await lib.fromWifString(encoded, wrongVersion),
      { message: 'Invalid WIF length' },
      `fromWifString should reject length ${length} with wrong expectedVersion, throwing length error not version error`
    )
    
    t.assert.throws(
      () => lib.fromWifStringSync(encoded, wrongVersion),
      { message: 'Invalid WIF length' },
      `fromWifStringSync should reject length ${length} with wrong expectedVersion, throwing length error not version error`
    )
  }
})
