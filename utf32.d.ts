/**
 * UTF-32 encoding/decoding
 *
 * ```js
 * import { utf32fromString, utf32toString } from '@exodus/bytes/utf32.js'
 *
 * // loose
 * import { utf32fromStringLoose, utf32toStringLoose } from '@exodus/bytes/utf32.js'
 * ```
 *
 * _These methods by design encode/decode BOM (codepoint `U+FEFF` Byte Order Mark) as-is._
 *
 * @module @exodus/bytes/utf32.js
 */

/// <reference types="node" />

import type { Uint8ArrayBuffer, Uint32ArrayBuffer } from './array.js';

/**
 * Output format for UTF-32 encoding
 */
export type Utf32Format = 'uint32' | 'uint8-le' | 'uint8-be';

/**
 * Encode a string to UTF-32 bytes (strict mode)
 *
 * Throws on invalid Unicode (unpaired surrogates)
 *
 * @param string - The string to encode
 * @param format - Output format (default: 'uint32')
 * @returns The encoded bytes
 */
export function utf32fromString(string: string, format?: 'uint32'): Uint32ArrayBuffer;
export function utf32fromString(string: string, format: 'uint8-le'): Uint8ArrayBuffer;
export function utf32fromString(string: string, format: 'uint8-be'): Uint8ArrayBuffer;
export function utf32fromString(string: string, format?: Utf32Format): Uint32ArrayBuffer | Uint8ArrayBuffer;

/**
 * Encode a string to UTF-32 bytes (loose mode)
 *
 * Replaces invalid Unicode (unpaired surrogates) with replacement codepoints `U+FFFD`.
 *
 * _Such replacement is a non-injective function, is irreversible and causes collisions.\
 * Prefer using strict throwing methods for cryptography applications._
 *
 * @param string - The string to encode
 * @param format - Output format (default: 'uint32')
 * @returns The encoded bytes
 */
export function utf32fromStringLoose(string: string, format?: 'uint32'): Uint32ArrayBuffer;
export function utf32fromStringLoose(string: string, format: 'uint8-le'): Uint8ArrayBuffer;
export function utf32fromStringLoose(string: string, format: 'uint8-be'): Uint8ArrayBuffer;
export function utf32fromStringLoose(string: string, format?: Utf32Format): Uint32ArrayBuffer | Uint8ArrayBuffer;

/**
 * Decode UTF-32 bytes to a string (strict mode)
 *
 * Throws on invalid UTF-32 byte sequences
 *
 * Throws on non-even byte length.
 *
 * @param arr - The bytes to decode
 * @param format - Input format (default: 'uint32')
 * @returns The decoded string
 */
export function utf32toString(arr: Uint32ArrayBuffer, format?: 'uint32'): string;
export function utf32toString(arr: Uint8ArrayBuffer, format: 'uint8-le'): string;
export function utf32toString(arr: Uint8ArrayBuffer, format: 'uint8-be'): string;
export function utf32toString(arr: Uint32ArrayBuffer | Uint8ArrayBuffer, format?: Utf32Format): string;

/**
 * Decode UTF-32 bytes to a string (loose mode)
 *
 * Replaces invalid UTF-32 byte sequences with replacement codepoints `U+FFFD`.
 *
 * _Such replacement is a non-injective function, is irreversible and causes collisions.\
 * Prefer using strict throwing methods for cryptography applications._
 *
 * Throws on non-even byte length.
 *
 * @param arr - The bytes to decode
 * @param format - Input format (default: 'uint32')
 * @returns The decoded string
 */
export function utf32toStringLoose(arr: Uint32ArrayBuffer, format?: 'uint32'): string;
export function utf32toStringLoose(arr: Uint8ArrayBuffer, format: 'uint8-le'): string;
export function utf32toStringLoose(arr: Uint8ArrayBuffer, format: 'uint8-be'): string;
export function utf32toStringLoose(arr: Uint32ArrayBuffer | Uint8ArrayBuffer, format?: Utf32Format): string;
