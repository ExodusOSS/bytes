import { assertUint8 } from './assert.js'
import { nativeDecoder } from './fallback/_utils.js'

const alphabet = [...'123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz']
const codes = new Uint8Array(alphabet.map((x) => x.charCodeAt(0)))
const ZERO = alphabet[0]

const _0n = BigInt(0)
const _1n = BigInt(1)
const _8n = BigInt(8)
const _32n = BigInt(32)
const _58n = BigInt(58)

let table // 15 * 82, diagonal, <1kb

export function toBase58(arr) {
  assertUint8(arr)
  const length = arr.length
  if (length === 0) return ''

  let zeros = 0
  while (zeros < length && arr[zeros] === 0) zeros++

  if (length > 60) {
    // Slow path. Can be optimized ~10%, but the main factor is /58n division anyway, so doesn't matter much
    let x = _0n
    for (let i = 0; i < arr.length; i++) x = (x << _8n) | BigInt(arr[i])

    let out = ''
    while (x) {
      const d = x / _58n
      out = alphabet[Number(x - _58n * d)] + out
      x = d
    }

    return ZERO.repeat(zeros) + out
  }

  // We run fast mode operations only on short (<=60 bytes) inputs, via precomputation table
  if (!table) {
    table = []
    let x = _1n
    for (let i = 0; i < 15; i++) {
      // Convert x to base 58 digits
      const in58 = []
      let y = x
      while (y) {
        const d = y / _58n
        in58.push(Number(y - _58n * d))
        y = d
      }

      table.push(new Uint8Array(in58))
      x <<= _32n
    }
  }

  const res = []
  {
    let j = 0
    // We group each 4 bytes into 32-bit chunks
    // Not using u32arr to not deal with remainder + BE/LE differences
    for (let i = length - 1; i >= 0; i -= 4) {
      let c
      if (i > 2) {
        c = (arr[i] | (arr[i - 1] << 8) | (arr[i - 2] << 16) | (arr[i - 3] << 24)) >>> 0
      } else if (i > 1) {
        c = arr[i] | (arr[i - 1] << 8) | (arr[i - 2] << 16)
      } else {
        c = i === 1 ? arr[i] | (arr[i - 1] << 8) : arr[i]
      }

      const row = table[j++]
      if (c === 0) continue
      const olen = res.length
      const nlen = row.length
      let k = 0
      for (; k < olen; k++) res[k] += c * row[k]
      while (k < nlen) res.push(c * row[k++])
    }
  }

  // We can now do a single scan over regular numbers under MAX_SAFE_INTEGER
  // Note: can't use int32 operations on them, as they are outside of 2**32 range
  // This is faster though
  {
    let carry = 0
    let i = 0
    while (i < res.length) {
      const c = res[i] + carry
      carry = Math.floor(c / 58)
      res[i++] = c - carry * 58
    }

    while (carry) {
      const c = carry
      carry = Math.floor(c / 58)
      res[i++] = c - carry * 58
    }
  }

  if (nativeDecoder) {
    const oa = new Uint8Array(res.length)
    let j = 0
    for (let i = res.length - 1; i >= 0; i--) oa[j++] = codes[res[i]]
    return ZERO.repeat(zeros) + nativeDecoder.decode(oa)
  }

  let out = ''
  for (let i = res.length - 1; i >= 0; i--) out += alphabet[res[i]]
  return ZERO.repeat(zeros) + out
}
