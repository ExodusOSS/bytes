# `@exodus/bytes`

`Uint8Array` conversion to and from `base64`, `base32`, `base58`, `hex`, `utf8`, `utf16`, `bech32` and `wif`

## Strict

Performs proper input validation, ensures no garbage-in-garbage-out

Tested on Node.js, Deno, Bun, browsers (including Servo), Hermes, QuickJS and barebone engines in CI [(how?)](https://github.com/ExodusMovement/test#exodustest)

## Fast

* `10-20x` faster than `Buffer` polyfill
* `2-10x` faster than `iconv-lite`

The above was for the js fallback

It's up to `100x` when native impl is available \
e.g. in `utf8fromString` on Hermes / React Native or `fromHex` in Chrome

Also:
* `3-8x` faster than `bs58`
* `10-30x` faster than `@scure/base` (or `>100x` on Node.js <25)
* Faster in `utf8toString` / `utf8fromString` than `Buffer` or `TextDecoder` / `TextEncoder` on Node.js

See [Performance](./Performance.md) for more info

## TextEncoder / TextDecoder polyfill

```js
import { TextDecoder, TextEncoder } from '@exodus/bytes/encoding.js'
```

Less than half the bundle size of [text-encoding](https://npmjs.com/text-encoding), [whatwg-encoding](https://npmjs.com/whatwg-encoding) or [iconv-lite](https://npmjs.com/iconv-lite) (gzipped or not), and [is much faster](#fast).

Spec compliant, passing WPT and covered with extra tests.

Moreover, tests for this library uncovered [bugs in all major implementations](https://docs.google.com/spreadsheets/d/1pdEefRG6r9fZy61WHGz0TKSt8cO4ISWqlpBN5KntIvQ/edit).

[Faster than Node.js native implementation on Node.js](https://github.com/nodejs/node/issues/61041#issuecomment-3649242024).

### Caveat: `TextDecoder` / `TextEncoder` APIs are lossy by default per spec

_These are only provided as a compatibility layer, prefer hardened APIs instead in new code._

 * `TextDecoder` can (and should) be used with `{ fatal: true }` option for all purposes demanding correctness / lossless transforms

 * `TextEncoder` does not support a fatal mode per spec, it always performs replacement.

   That is not suitable for hashing, cryptography or consensus applications.\
   Otherwise there would be non-equal strings with equal signatures and hashes — the collision is caused by the lossy transform of a JS string to bytes.
   Those also survive e.g. `JSON.stringify`/`JSON.parse` or being sent over network.

   Use strict APIs in new applications, see `utf8fromString` / `utf16fromString` below.\
   Those throw on non-well-formed strings by default.

## API

### `@exodus/bytes/utf8.js`

##### `utf8fromString(str, format = 'uint8')`
##### `utf8fromStringLoose(str, format = 'uint8')`
##### `utf8toString(arr)`
##### `utf8toStringLoose(arr)`

### `@exodus/bytes/utf16.js`

##### `utf16fromString(str, format = 'uint16')`
##### `utf16fromStringLoose(str, format = 'uint16')`
##### `utf16toString(arr, 'uint16')`
##### `utf16toStringLoose(arr, 'uint16')`

### `@exodus/bytes/single-byte.js`

##### `createDecoder(encoding, loose = false)`

Create a decoder for a supported one-byte `encoding`.

Returns a function `decode(arr)` that decodes bytes to a string.

##### `windows1252toString(arr)`

Decode `windows-1252` bytes to a string.

Also supports `ascii` and `latin-1` as those are strict subsets of `windows-1252`.

There is no loose variant for this encoding, all bytes can be decoded.

Same as `windows1252toString = createDecoder('windows-1252')`.

### `@exodus/bytes/hex.js`

##### `toHex(arr)`
##### `fromHex(string)`

### `@exodus/bytes/base64.js`

##### `toBase64(arr, { padding = true })`
##### `toBase64url(arr, { padding = false })`
##### `fromBase64(str, { format = 'uint8', padding = 'both' })`
##### `fromBase64url(str, { format = 'uint8', padding = false })`
##### `fromBase64any(str, { format = 'uint8', padding = 'both' })`

### `@exodus/bytes/base32.js`

##### `toBase32(arr, { padding = false })`
##### `toBase32hex(arr, { padding = false })`
##### `fromBase32(str, { format = 'uint8', padding = 'both' })`
##### `fromBase32hex(str, { format = 'uint8', padding = 'both' })`

### `@exodus/bytes/bech32.js`

##### `getPrefix(str, limit = 90)`
##### `toBech32(prefix, bytes, limit = 90)`
##### `fromBech32(str, limit = 90)`
##### `toBech32m(prefix, bytes, limit = 90)`
##### `fromBech32m(str, limit = 90)`

### `@exodus/bytes/base58.js`

##### `toBase58(arr)`
##### `fromBase58(str, format = 'uint8')`

### `@exodus/bytes/base58check.js`

##### `async toBase58check(arr)`
##### `toBase58checkSync(arr)`
##### `async fromBase58check(str, format = 'uint8')`
##### `fromBase58checkSync(str, format = 'uint8')`
##### `makeBase58check(hashAlgo, hashAlgoSync)`

### `@exodus/bytes/wif.js`

##### `async fromWifString(string, version)`
##### `fromWifStringSync(string, version)`
##### `async toWifString({ version, privateKey, compressed })`
##### `toWifStringSync({ version, privateKey, compressed })`

## License

[MIT](./LICENSE)
