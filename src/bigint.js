import { assert, assertUint8 } from '../assert.js'

const _0n = BigInt(0)

// From a non-negative hex string, treats empty string as 0
export function fromHex(s) {
  assert(typeof s === 'string', 'Input should be a string')
  assert(!/[^0-9a-f]/iu.test(s), 'Invalid character in hex input')
  return BigInt('0x' + (s || '0'))
}

// TODO: should we return an empty string for 0n if no hexLength specified?
// Returns an even-sized hex, returns '00' for 0n
export function toHex(x, byteLength) {
  assert(typeof x === 'bigint' || Number.isSafeInteger(x), 'Should be a bigint or a safe integer')
  assert(x >= 0, 'Should be non-negative') // >= is fine between bigint and numbers
  const hex = x.toString(16)
  if (byteLength !== undefined) {
    assert(byteLength * 2 >= hex.length, `Can not fit supplied number to ${hexLength} hex symbols`)
    return hex.padStart(byteLength * 2, '0')
  }
  return hex.length % 2 !== 0 ? '0' + hex : hex
}

// TODO: should we return an empty buffer for 0n?
// Returns [0] for 0n
export const toBuffer = (x, length) => Buffer.from(toHex(x, length), 'hex') // typechecks

export function toNumber(x) {
  const n = Number(x)
  assert(Number.isSafeInteger(n) && BigInt(n) === x, 'Can not safely convert large bigint to number')
  return n
}

export function toUint8(x, length) {
  const buf = toBuffer(x, length) // typechecks
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength) // zero-copy
}

export function fromUint8(a) {
  assertUint8(a)
  const buf = Buffer.isBuffer(a) ? a : Buffer.from(a.buffer, a.byteOffset, a.byteLength) // zero-copy
  return BigInt('0x' + buf.toString('hex'))
}

export function parse(s, {
  negative = false,
  strings = false,
  buffers = false,
  arrays = false,
} = Object.create(null)) {
  let x
  switch (typeof s) {
    case 'string':
      assert(strings, 'String input is disallowed by \'strings\' option')
      switch (strings) {
        case 10:
          assert(/^-?[0-9]+$/u.test(s), 'Invalid character in decimal string input')
          x = BigInt(s)
          break
        case 16:
          // this allows negative hex strings on negative=true and strings=16 combination!
          x = negative && s[0] === '-' ? 0n - fromHex(s.slice(1)) : fromHex(s)
          break
        default:
          throw new Error('Invalid \'strings\' value, should be 10 (decimal) or 16 (hex)')
      }
      break
    case 'bigint':
      x = s
      break
    case 'number':
      assert(Number.isSafeInteger(s), 'Should be a safe integer')
      x = BigInt(s)
      break
    case 'object':
      if (Array.isArray(s)) {
        assert(arrays, 'Uint8Array / Buffer input disallowed by \'arrays\' option')
        const buf = Buffer.from(s)
        assert(buf.every((c, i) => s[i] === c), 'Array should contain only bytes (0-255)')
        x = fromUint8(buf)
      } else if (s instanceof Uint8Array) {    
        assert(buffers, 'Uint8Array / Buffer input disallowed by \'buffers\' option')
        x = fromUint8(s)
      } else {
        throw new Error('Unsupported object')
      }
      break
    default:
      throw new Error('Unsupported type')
  }
  if (!negative) assert(x >= 0, 'Negative input disallowed by \'negative\' option')
  return x
}

function toFormat(x, format, length) {
  assert(typeof x === 'bigint') // internal use only
  switch (format) {
    case 'bigint': return x
    case 'number': return toNumber(x) // checks for safe conversion
    case 'uint8': return toUint8(x, length)
    case 'buffer': return toBuffer(x, length)
    case 'hex': return toHex(x, length)
    default: throw new Error('Unexpected format')
  }
}

export function sum(arr, { format = 'bigint', length, ...parseOpts } = Object.create(null)) {
  const res = [...arr].reduce((a, c) => a + parse(c, parseOpts), _0n)
  return toFormat(res, format, length)
}
