import { typedView } from './array.js'
import { assertUint8 } from './assert.js'
import { toBase58, fromBase58 } from './base58.js'
import { hashSync } from '@exodus/crypto/hash'

// Note: while API is async, we use hashSync for now until we improve webcrypto perf for hash256
// Inputs to base58 are typically very small, and that makes a difference

const E_CHECKSUM = 'Invalid checksum'

// checksum length is 4, i.e. only the first 4 bytes of the hash are used

function encodeWithChecksum(arr, checksum) {
  // arr type in already validated in input
  const res = new Uint8Array(arr.length + 4)
  res.set(arr, 0)
  res.set(checksum.subarray(0, 4), arr.length)
  return toBase58(res)
}

function decodeWithChecksum(str) {
  const arr = fromBase58(str) // checks input
  const payloadSize = arr.length - 4
  if (payloadSize < 0) throw new Error(E_CHECKSUM)
  return [arr.subarray(0, payloadSize), arr.subarray(payloadSize)]
}

function assertChecksum(c, r) {
  if ((c[0] ^ r[0]) | (c[1] ^ r[1]) | (c[2] ^ r[2]) | (c[3] ^ r[3])) throw new Error(E_CHECKSUM)
}

export const makeBase58check = (hashAlgo, hashAlgoSync) => {
  const apis = {
    async encode(arr) {
      assertUint8(arr)
      return encodeWithChecksum(arr, await hashAlgo(arr))
    },
    async decode(str, format = 'uint8') {
      const [payload, checksum] = decodeWithChecksum(str)
      assertChecksum(checksum, await hashAlgo(payload))
      return typedView(payload, format)
    },
  }
  if (!hashAlgoSync) return apis
  return {
    ...apis,
    encodeSync(arr) {
      assertUint8(arr)
      return encodeWithChecksum(arr, hashAlgoSync(arr))
    },
    decodeSync(str, format = 'uint8') {
      const [payload, checksum] = decodeWithChecksum(str)
      assertChecksum(checksum, hashAlgoSync(payload))
      return typedView(payload, format)
    },
  }
}

const hash256sync = (x) => hashSync('sha256', hashSync('sha256', x, 'uint8'), 'uint8')
const hash256 = hash256sync // See note at the top
const {
  encode: toBase58check,
  decode: fromBase58check,
  encodeSync: toBase58checkSync,
  decodeSync: fromBase58checkSync,
} = makeBase58check(hash256, hash256sync)

export { toBase58check, fromBase58check, toBase58checkSync, fromBase58checkSync }
