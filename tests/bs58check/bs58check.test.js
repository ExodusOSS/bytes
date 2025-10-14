// From https://github.com/bitcoinjs/bs58check/tree/master/test

import { fromBase58check as decode, toBase58check as encode } from '@exodus/bytes/base58check.js'
import { toHex as bytesToHex, fromHex as hexToBytes } from '@exodus/bytes/hex.js'
import tape from '@exodus/test/tape'
import fixtures from './fixtures.cjs'

const { valid, invalid } = fixtures

valid.forEach(function (f) {
  tape('decodes ' + f.string, async function (t) {
    t.plan(1)
    var actual = bytesToHex(await decode(f.string))
    t.equal(actual, f.payload)
  })
})

invalid.forEach(function (f) {
  tape('decode throws on ' + f.string, async function (t) {
    t.plan(1)
    // eslint-disable-next-line  @exodus/mutable/no-param-reassign-prop-only
    const ex =
      f.exception === 'Non-base58 character' ? 'Invalid character in base58 input' : f.exception
    await t.rejects(async function () {
      await decode(f.string)
    }, new RegExp(ex))
  })
})

valid.forEach(function (f) {
  tape('encodes ' + f.string, async function (t) {
    t.plan(2)
    var u8 = hexToBytes(f.payload)
    var buffer = Buffer.from(u8)
    var actual1 = await encode(u8)
    var actual3 = await encode(buffer)

    t.equal(actual1, f.string)
    t.equal(actual3, f.string)
  })
})
