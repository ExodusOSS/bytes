/// <reference types="node" />

import type { OutputFormat, StrictUint8Array } from './array.js';

/**
 * Encodes a string to UTF-8 bytes (strict mode)
 * Throws on invalid Unicode (unpaired surrogates)
 * @param str - The string to encode
 * @param format - Output format (default: 'uint8')
 * @returns The encoded bytes
 */
export function utf8fromString(str: string, format?: 'uint8'): StrictUint8Array;
export function utf8fromString(str: string, format: 'buffer'): Buffer;
export function utf8fromString(str: string, format?: OutputFormat): StrictUint8Array | Buffer;

/**
 * Encodes a string to UTF-8 bytes (loose mode)
 * Replaces invalid Unicode with replacement character
 * @param str - The string to encode
 * @param format - Output format (default: 'uint8')
 * @returns The encoded bytes
 */
export function utf8fromStringLoose(str: string, format?: 'uint8'): StrictUint8Array;
export function utf8fromStringLoose(str: string, format: 'buffer'): Buffer;
export function utf8fromStringLoose(str: string, format?: OutputFormat): StrictUint8Array | Buffer;

/**
 * Decodes UTF-8 bytes to a string (strict mode)
 * Throws on invalid UTF-8 sequences
 * @param arr - The bytes to decode
 * @returns The decoded string
 */
export function utf8toString(arr: StrictUint8Array): string;

/**
 * Decodes UTF-8 bytes to a string (loose mode)
 * Replaces invalid sequences with replacement character
 * @param arr - The bytes to decode
 * @returns The decoded string
 */
export function utf8toStringLoose(arr: StrictUint8Array): string;

