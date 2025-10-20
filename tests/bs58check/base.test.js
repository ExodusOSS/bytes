// From https://github.com/bitcoinjs/bs58check/tree/master/test

import tape from '@exodus/test/tape'
import { fromHex as hexToBytes } from '@exodus/bytes/hex.js'
import { makeBase58check } from '@exodus/bytes/base58check.js'
import { hash } from '@exodus/crypto/hash'

const blake256x2 = async (x) => hash('blake256', await hash('blake256', x, 'uint8'), 'uint8')
const bs58check = makeBase58check(blake256x2)

tape('custom checksum function (blake256x2)', async function (t) {
  const address = 'DsRLWShUQexhKE1yRdpe2kVH7fmULcEUFDk'
  const payload = hexToBytes('073f0415e993935a68154fda7018b887c4e3fe8b4e10')

  t.equal(await bs58check.encode(payload), address)
  t.same(await bs58check.decode(address), payload)

  t.end()
})
