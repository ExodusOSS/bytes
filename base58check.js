import { typedView } from './array.js'
import { assertUint8 } from './assert.js'
import { toBase58, fromBase58 } from './base58.js'
import { hashSync } from '@exodus/crypto/hash'

// Note: while API is async, we use hashSync for now until we improve webcrypto perf for hash256
// Inputs to base58 are typically very small, and that makes a difference

const E_CHECKSUM = 'Invalid checksum'

export const makeBase58check = (hashAlgo) => ({
  async encode(arr) {
    assertUint8(arr)
    const checksum = await hashAlgo(arr)
    const res = new Uint8Array(arr.length + 4)
    res.set(arr, 0)
    res.set(checksum.subarray(0, 4), arr.length)
    return toBase58(res)
  },
  async decode(str, format = 'uint8') {
    const arr = fromBase58(str) // checks input
    const payloadSize = arr.length - 4
    if (payloadSize < 0) throw new Error(E_CHECKSUM)
    const payload = arr.subarray(0, payloadSize)
    const c = arr.subarray(payloadSize)
    const r = await hashAlgo(payload)
    if ((c[0] ^ r[0]) | (c[1] ^ r[1]) | (c[2] ^ r[2]) | (c[3] ^ r[3])) throw new Error(E_CHECKSUM)
    return typedView(payload, format)
  },
})

const hash256 = (x) => hashSync('sha256', hashSync('sha256', x, 'uint8'), 'uint8')
const { encode: toBase58check, decode: fromBase58check } = makeBase58check(hash256)

export { toBase58check, fromBase58check }
