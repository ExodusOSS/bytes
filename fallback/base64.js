import { assertUint8 } from '../assert.js'

// See https://datatracker.ietf.org/doc/html/rfc4648

const { TextDecoder } = globalThis
const nativeDecoder = TextDecoder?.toString().includes('[native code]') ? new TextDecoder() : null
const BASE64 = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/']
const BASE64URL = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_']
const BASE64_PAIRS = []
const BASE64URL_PAIRS = []
const BASE64_CODES = nativeDecoder ? new Uint8Array(64) : null
const BASE64URL_CODES = nativeDecoder ? new Uint8Array(64) : null

// Alternatively, we could have mapped 0-255 bytes to charcodes and just used btoa(ascii),
// but that approach is _slower_ than our toBase64js function, even on Hermes

// We construct output by concatenating chars, this seems to be fine enough on modern JS engines
export function toBase64(arr, isURL, padding) {
  assertUint8(arr)
  const fullChunks = Math.floor(arr.length / 3)
  const fullChunksBytes = fullChunks * 3
  let o = ''
  let i = 0

  const alphabet = isURL ? BASE64URL : BASE64
  const pairs = isURL ? BASE64URL_PAIRS : BASE64_PAIRS
  const map = isURL ? BASE64_CODES : BASE64URL_CODES
  if (pairs.length === 0) {
    for (let i = 0; i < 64; i++) {
      for (let j = 0; j < 64; j++) pairs.push(`${alphabet[i]}${alphabet[j]}`)
      if (map) map[i] = alphabet[i].charCodeAt(0)
    }
  }

  // Fast path for complete blocks
  // This whole loop can be commented out, the algorithm won't change, it's just an optimization of the next loop
  if (nativeDecoder) {
    const oa = new Uint8Array(fullChunks * 4)
    for (let j = 0; i < fullChunksBytes; i += 3) {
      const a = arr[i]
      const b = arr[i + 1]
      const c = arr[i + 2]
      oa[j++] = map[a >> 2]
      oa[j++] = map[((a & 0x3) << 4) | (b >> 4)]
      oa[j++] = map[((b & 0xf) << 2) | (c >> 6)]
      oa[j++] = map[c & 0x3f]
    }

    o = nativeDecoder.decode(oa)
  } else {
    for (; i < fullChunksBytes; i += 3) {
      const a = arr[i]
      const b = arr[i + 1]
      const c = arr[i + 2]
      o += pairs[(a << 4) | (b >> 4)] + pairs[((b & 0x0f) << 8) | c]
    }
  }

  // If we have something left, process it with a full algo
  let carry = 0
  let shift = 2 // First byte needs to be shifted by 2 to get 6 bits
  const length = arr.length
  for (; i < length; i++) {
    const x = arr[i]
    o += alphabet[carry | (x >> shift)] // shift >= 2, so this fits
    if (shift === 6) {
      shift = 0
      o += alphabet[x & 0x3f]
    }

    carry = (x << (6 - shift)) & 0x3f
    shift += 2 // Each byte prints 6 bits and leaves 2 bits
  }

  if (shift !== 2) o += alphabet[carry] // shift 2 means we have no carry left
  if (padding) o += ['', '==', '='][length - fullChunksBytes]

  return o
}

let fromBase64jsMap

// Assumes valid input and no chars after =, checked at API
// Last chunk is rechecked at API too
export function fromBase64(str) {
  const map = fromBase64jsMap || new Array(256)
  if (!fromBase64jsMap) {
    fromBase64jsMap = map
    BASE64.forEach((c, i) => (map[c.charCodeAt(0)] = i))
    map['-'.charCodeAt(0)] = map['+'.charCodeAt(0)] // for base64url
    map['_'.charCodeAt(0)] = map['/'.charCodeAt(0)] // for base64url
  }

  let inputLength = str.length
  while (str[inputLength - 1] === '=') inputLength--

  const arr = new Uint8Array(Math.floor((inputLength * 3) / 4))
  const tailLength = inputLength % 4
  const mainLength = inputLength - tailLength // multiples of 4

  let at = 0
  let i = 0
  let tmp

  while (i < mainLength) {
    // a [ b c ] d, each 6 bits
    const bc = (map[str.charCodeAt(i + 1)] << 6) | map[str.charCodeAt(i + 2)]
    arr[at++] = (map[str.charCodeAt(i)] << 2) | (bc >> 10)
    arr[at++] = (bc >> 2) & 0xff
    arr[at++] = ((bc << 6) & 0xff) | map[str.charCodeAt(i + 3)]
    i += 4
  }

  if (tailLength === 3) {
    tmp =
      (map[str.charCodeAt(i)] << 10) |
      (map[str.charCodeAt(i + 1)] << 4) |
      (map[str.charCodeAt(i + 2)] >> 2)
    arr[at++] = (tmp >> 8) & 0xff
    arr[at++] = tmp & 0xff
  } else if (tailLength === 2) {
    tmp = (map[str.charCodeAt(i)] << 2) | (map[str.charCodeAt(i + 1)] >> 4)
    arr[at++] = tmp & 0xff
  }

  return arr
}
