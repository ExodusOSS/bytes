import { fromHex, toHex } from '@exodus/bytes/hex.js'
import {
  fromWifString,
  fromWifStringSync,
  toWifString,
  toWifStringSync,
} from '@exodus/bytes/wif.js'
import fixtures from './fixtures.cjs'
import { test } from 'node:test'

// Based on https://github.com/bitcoinjs/wif/tree/master/test

const { invalid, valid } = fixtures

for (const f of valid) {
  test(`encode returns ${f.WIF} for ${f.privateKeyHex.slice(0, 20)}... (${f.version})`, async (t) => {
    const privateKey = fromHex(f.privateKeyHex)
    const wif = { version: f.version, privateKey, compressed: f.compressed }
    t.assert.strictEqual(await toWifString(wif), f.WIF)
    t.assert.strictEqual(toWifStringSync(wif), f.WIF)
  })

  test(`decode returns ${f.privateKeyHex.slice(0, 20)}... (${f.version}) for ${f.WIF}`, async (t) => {
    const actual = await fromWifString(f.WIF, f.version)
    t.assert.deepStrictEqual(actual, fromWifStringSync(f.WIF, f.version))
    t.assert.deepStrictEqual(actual, await fromWifString(f.WIF))
    t.assert.deepStrictEqual(actual, fromWifStringSync(f.WIF))
    t.assert.strictEqual(actual.version, f.version)
    t.assert.strictEqual(toHex(actual.privateKey), f.privateKeyHex)
    t.assert.strictEqual(actual.compressed, f.compressed)
  })

  test(`decode/encode for ${f.WIF}`, async (t) => {
    const decoded = await fromWifString(f.WIF, f.version)
    t.assert.deepStrictEqual(decoded, fromWifStringSync(f.WIF, f.version))
    const encoded = await toWifString(decoded)
    t.assert.deepStrictEqual(encoded, toWifStringSync(decoded))
    t.assert.strictEqual(encoded, f.WIF)
  })
}

for (const f of invalid.encode) {
  test(`throws ${f.exception} for ${f.privateKeyHex}`, async (t) => {
    const wif = { version: f.version, privateKey: fromHex(f.privateKeyHex) }
    const exception =
      f.exception === 'Invalid privateKey length'
        ? 'Expected privateKey to be an Uint8Array of size 32'
        : f.exception
    await t.assert.rejects(() => toWifString(wif), new RegExp(exception))
    t.assert.throws(() => toWifStringSync(wif), new RegExp(exception))
  })
}

for (const f of invalid.decode) {
  test(`throws ${f.exception} for ${f.WIF}`, async (t) => {
    await t.assert.rejects(() => fromWifString(f.WIF, f.version), new RegExp(f.exception))
    t.assert.throws(() => fromWifStringSync(f.WIF, f.version), new RegExp(f.exception))
  })
}
