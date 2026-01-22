/**
 * Single-byte encoding/decoding
 *
 * ```js
 * import { createSinglebyteDecoder, createSinglebyteEncoder } from '@exodus/bytes/single-byte.js'
 * import { latin1toString, latin1fromString } from '@exodus/bytes/single-byte.js'
 * import { windows1252toString, windows1252fromString } from '@exodus/bytes/single-byte.js'
 * ```
 *
 * Supports various single-byte character encodings like ISO-8859-* and Windows-125*.
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
