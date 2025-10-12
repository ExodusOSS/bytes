import { describe } from 'node:test'
import { loadDir } from './loader.cjs'
import * as base64 from '@exodus/bytes/base64.js'
import * as hex from '@exodus/bytes/hex.js'

// On Node.js, we return pooled Uint8Array instances if pooling is not off
// Like Buffer.from("string") does
// Let's disable that as test262 does not expect it
const deview = (uint8) => (uint8.length === uint8.buffer.length ? uint8 : new Uint8Array(uint8))

// NOTE: we have "non-zero padding bits" tests disabled by commenting them out, as we enforce padding bits to be zero

// NOTE: this has recursion protection and is testing original impl if it's present

Object.defineProperties(Uint8Array, {
  fromBase64: {
    writable: true,
    configurable: true,
    value:
      Uint8Array.fromBase64 ||
      function fromBase64(str, options = {}) {
        if (typeof str !== 'string') throw new TypeError('Input is not a string') // duplicate check because of replaceAll
        const { alphabet = 'base64', lastChunkHandling = 'loose' } = options
        if (alphabet !== 'base64' && alphabet !== 'base64url')
          throw new TypeError('Invalid alphabet')
        str = str.replaceAll(/[\t\n\f\r ]/gu, '') // 0x0009 (TAB), 0x000A (LF), 0x000C (FF), 0x000D (CR), 0x0020 (SPACE)
        let padding = true
        if (lastChunkHandling === 'stop-before-partial') {
          const more = str.length % 4
          const tail = str.slice(-more)
          if (tail[0] !== '=' && tail[1] !== '=') str = str.slice(0, str.length - more) // otherwise invalid
        } else if (lastChunkHandling === 'loose') {
          padding = 'both'
        } else if (lastChunkHandling !== 'strict') {
          throw new TypeError('Invalid lastChunkHandling')
        }

        const method = alphabet === 'base64url' ? base64.fromBase64url : base64.fromBase64
        return deview(method(str, { padding }))
      },
  },
  fromHex: {
    writable: true,
    configurable: true,
    value:
      Uint8Array.fromHex ||
      function fromHex(str) {
        return deview(hex.fromHex(str))
      },
  },
})

// eslint-disable-next-line no-extend-native
Object.defineProperties(Uint8Array.prototype, {
  toBase64: {
    writable: true,
    configurable: true,
    value:
      Uint8Array.prototype.toBase64 ||
      function toBase64({ omitPadding = false, alphabet = 'base64' } = {}) {
        if (alphabet === 'base64url') return base64.toBase64url(this, { padding: !omitPadding })
        if (alphabet === 'base64') return base64.toBase64(this, { padding: !omitPadding })
        throw new TypeError('Invalid alphabet')
      },
  },
  toHex: {
    writable: true,
    configurable: true,
    value:
      Uint8Array.prototype.toHex ||
      function toHex() {
        return hex.toHex(this)
      },
  },
})

describe('test262', () => {
  loadDir('built-ins/Uint8Array/fromBase64')
  loadDir('built-ins/Uint8Array/fromHex')
  loadDir('built-ins/Uint8Array/prototype/toBase64')
  loadDir('built-ins/Uint8Array/prototype/toHex')
})

// List of files so that bundler can locate all these
/* @preserve
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/fromBase64/alphabet.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/fromBase64/descriptor.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/fromBase64/ignores-receiver.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/fromBase64/illegal-characters.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/fromBase64/last-chunk-handling.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/fromBase64/last-chunk-invalid.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/fromBase64/length.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/fromBase64/name.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/fromBase64/option-coercion.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/fromBase64/results.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/fromBase64/string-coercion.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/fromBase64/whitespace.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/fromHex/descriptor.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/fromHex/ignores-receiver.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/fromHex/illegal-characters.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/fromHex/length.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/fromHex/name.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/fromHex/odd-length-input.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/fromHex/results.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/fromHex/string-coercion.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/prototype/toBase64/alphabet.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/prototype/toBase64/descriptor.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/prototype/toBase64/length.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/prototype/toBase64/name.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/prototype/toBase64/omit-padding.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/prototype/toBase64/option-coercion.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/prototype/toBase64/results.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/prototype/toHex/descriptor.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/prototype/toHex/length.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/prototype/toHex/name.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/built-ins/Uint8Array/prototype/toHex/results.js'))
*/
