/**
 * Implements bech32 and bech32m from [BIP173](https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki)
 * and [BIP350](https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki).
 *
 * ```js
 * import { fromBech32, toBech32, fromBech32m, toBech32m, getPrefix } from '@exodus/bytes/bech32.js'
 * ```
 *
 * @module @exodus/bytes/bech32.js
 */

/// <reference types="node" />

import type { Uint8ArrayBuffer } from './array.js';

/**
 * Result of decoding a bech32 or bech32m string
 */
export interface Bech32DecodeResult {
  /** The human-readable prefix */
  prefix: string;
  /** The decoded bytes */
  bytes: Uint8Array;
}

/**
 * Encode bytes to a bech32 string (BIP 173)
 *
 * @param prefix - The human-readable prefix (e.g., 'bc' for Bitcoin)
 * @param bytes - The input bytes to encode
 * @param limit - Maximum length of the encoded string (default: 90)
 * @returns The bech32 encoded string
 */
export function toBech32(prefix: string, bytes: Uint8ArrayBuffer, limit?: number): string;

/**
 * Decode a bech32 string to bytes (BIP 173)
 *
 * @param str - The bech32 encoded string
 * @param limit - Maximum length of the input string (default: 90)
 * @returns The decoded prefix and bytes
 */
export function fromBech32(str: string, limit?: number): Bech32DecodeResult;

/**
 * Encode bytes to a bech32m string (BIP 350)
 *
 * @param prefix - The human-readable prefix (e.g., 'bc' for Bitcoin)
 * @param bytes - The input bytes to encode
 * @param limit - Maximum length of the encoded string (default: 90)
 * @returns The bech32m encoded string
 */
export function toBech32m(prefix: string, bytes: Uint8ArrayBuffer, limit?: number): string;

/**
 * Decode a bech32m string to bytes (BIP 350)
 *
 * @param str - The bech32m encoded string
 * @param limit - Maximum length of the input string (default: 90)
 * @returns The decoded prefix and bytes
 */
export function fromBech32m(str: string, limit?: number): Bech32DecodeResult;

/**
 * Extract the prefix from a bech32 or bech32m string without full validation
 *
 * This is a quick check that skips most validation.
 *
 * @param str - The bech32/bech32m encoded string
 * @param limit - Maximum length of the input string (default: 90)
 * @returns The lowercase prefix
 */
export function getPrefix(str: string, limit?: number): string;
