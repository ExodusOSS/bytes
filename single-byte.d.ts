/**
 * ```js
 * import { createSinglebyteDecoder, createSinglebyteEncoder } from '@exodus/bytes/single-byte.js'
 * import { windows1252toString, windows1252fromString } from '@exodus/bytes/single-byte.js'
 * import { latin1toString, latin1fromString } from '@exodus/bytes/single-byte.js'
 * ```
 *
 * Decode / encode the legacy single-byte encodings according to the
 * [Encoding standard](https://encoding.spec.whatwg.org/)
 * ([§9](https://encoding.spec.whatwg.org/#legacy-single-byte-encodings),
 * [§14.5](https://encoding.spec.whatwg.org/#x-user-defined)),
 * and [unicode.org](https://unicode.org/Public/MAPPINGS/ISO8859) `iso-8859-*` mappings.
 *
 * Supports all single-byte encodings listed in the WHATWG Encoding standard:
 * `ibm866`, `iso-8859-2`, `iso-8859-3`, `iso-8859-4`, `iso-8859-5`, `iso-8859-6`, `iso-8859-7`, `iso-8859-8`,
 * `iso-8859-8-i`, `iso-8859-10`, `iso-8859-13`, `iso-8859-14`, `iso-8859-15`, `iso-8859-16`, `koi8-r`, `koi8-u`,
 * `macintosh`, `windows-874`, `windows-1250`, `windows-1251`, `windows-1252`, `windows-1253`, `windows-1254`,
 * `windows-1255`, `windows-1256`, `windows-1257`, `windows-1258`, `x-mac-cyrillic` and `x-user-defined`.
 *
 * Also supports `iso-8859-1`, `iso-8859-9`, `iso-8859-11` as defined at
 * [unicode.org](https://unicode.org/Public/MAPPINGS/ISO8859)
 * (and all other `iso-8859-*` encodings there as they match WHATWG).
 *
 * > [!NOTE]
 * > While all `iso-8859-*` encodings supported by the [WHATWG Encoding standard](https://encoding.spec.whatwg.org/) match
 * > [unicode.org](https://unicode.org/Public/MAPPINGS/ISO8859), the WHATWG Encoding spec doesn't support
 * > `iso-8859-1`, `iso-8859-9`, `iso-8859-11`, and instead maps them as labels to `windows-1252`, `windows-1254`, `windows-874`.\
 * > `createSinglebyteDecoder()` (unlike `TextDecoder` or `legacyHookDecode()`) does not do such mapping,
 * > so its results will differ from `TextDecoder` for those encoding names.
 *
 * @module @exodus/bytes/single-byte.js
 */

/// <reference types="node" />

import type { Uint8ArrayBuffer } from './array.js';

/**
 * Options for single-byte encoding
 */
export interface SinglebyteEncoderOptions {
  /**
   * Encoding mode (default: 'fatal')
   * - `'fatal'`: throw an error on unmapped characters
   * 
   * Note: Currently, only 'fatal' mode is supported. Other modes will throw an error.
   */
  mode?: 'fatal';
}

/**
 * Create a decoder function for a single-byte character encoding
 *
 * @param encoding - The encoding name (e.g., 'iso-8859-1', 'windows-1252')
 * @param loose - If true, replaces unmapped bytes with replacement character instead of throwing (default: false)
 * @returns A function that decodes bytes to string
 */
export function createSinglebyteDecoder(
  encoding: string,
  loose?: boolean
): (arr: Uint8ArrayBuffer) => string;

/**
 * Create an encoder function for a single-byte character encoding
 *
 * @param encoding - The encoding name (e.g., 'iso-8859-1', 'windows-1252')
 * @param options - Encoding options
 * @returns A function that encodes string to bytes
 */
export function createSinglebyteEncoder(
  encoding: string,
  options?: SinglebyteEncoderOptions
): (string: string) => Uint8ArrayBuffer;

/**
 * Decode ISO-8859-1 (Latin-1) bytes to a string
 *
 * @param arr - The bytes to decode
 * @returns The decoded string
 */
export const latin1toString: (arr: Uint8ArrayBuffer) => string;

/**
 * Encode a string to ISO-8859-1 (Latin-1) bytes
 *
 * Throws on characters that cannot be encoded in Latin-1
 *
 * @param string - The string to encode
 * @returns The encoded bytes
 */
export const latin1fromString: (string: string) => Uint8ArrayBuffer;

/**
 * Decode Windows-1252 bytes to a string
 *
 * @param arr - The bytes to decode
 * @returns The decoded string
 */
export const windows1252toString: (arr: Uint8ArrayBuffer) => string;

/**
 * Encode a string to Windows-1252 bytes
 *
 * Throws on characters that cannot be encoded in Windows-1252
 *
 * @param string - The string to encode
 * @returns The encoded bytes
 */
export const windows1252fromString: (string: string) => Uint8ArrayBuffer;
