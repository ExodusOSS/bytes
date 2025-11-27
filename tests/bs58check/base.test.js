// Based on https://github.com/bitcoinjs/bs58check/tree/master/test

import { fromHex as hexToBytes } from '@exodus/bytes/hex.js'
import { makeBase58check } from '@exodus/bytes/base58check.js'
import { hash, hashSync } from '@exodus/crypto/hash'
import { test } from 'node:test'

const blake256x2 = async (x) => hash('blake256', await hash('blake256', x, 'uint8'), 'uint8')
const blake256x2sync = (x) => hashSync('blake256', hashSync('blake256', x, 'uint8'), 'uint8')
const bs58check = makeBase58check(blake256x2, blake256x2sync)

test('custom checksum function (blake256x2)', async (t) => {
  const address = 'DsRLWShUQexhKE1yRdpe2kVH7fmULcEUFDk'
  const payload = hexToBytes('073f0415e993935a68154fda7018b887c4e3fe8b4e10')

  t.assert.strictEqual(await bs58check.encode(payload), address)
  t.assert.deepStrictEqual(await bs58check.decode(address), payload)
  t.assert.strictEqual(bs58check.encodeSync(payload), address)
  t.assert.deepStrictEqual(bs58check.decodeSync(address), payload)
})
