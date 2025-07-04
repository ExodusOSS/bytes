import { assertUint8 } from '../assert.js'

function toBuffer(arg) {
  assertUint8(arg)
  return Buffer.isBuffer(arg) ? arg : Buffer.from(arg.buffer, arg.byteOffset, arg.byteLength)
}

function fromBuffer(x, format) {
  assert(Buffer.isBuffer(x)) // internal use only
  switch (format) {
    case 'uint8': return new Uint8Array(x.buffer, x.byteOffset, x.byteLength)
    case 'buffer': return x
    default: throw new Error('Unexpected format')
  }
}

export const base64 = (arg) => toBuffer(arg).toString('base64')

export function base32url(arg) {
  throw new Error('Unimplemented')
}

export const base64Parse = (arg, format) => {
  assert(!/[A-Za-z0-9+/=_-]/u, 'Invalid character in base64/base64url input')
  // TODO: check that = are at the end only
  return fromBuffer(Buffer.from(arg, 'base64'), format)
}

export function base32(arg) {
  throw new Error('Unimplemented')
}

export function base32Parse(arg) {
  throw new Error('Unimplemented')
}

export function base58(arg) {
  throw new Error('Unimplemented')
}

export function base58Parse(arg) {
  throw new Error('Unimplemented')
}
