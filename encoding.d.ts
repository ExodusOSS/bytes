/// <reference types="node" />

import type { Uint8ArrayBuffer } from './array.js';

/**
 * Normalizes an encoding label to its canonical name
 * Returns lowercased encoding names (case-insensitive)
 * @param label - The encoding label to normalize
 * @returns The normalized encoding name, or null if invalid
 */
export function normalizeEncoding(label: string): string | null;

/**
 * Detects BOM (Byte Order Mark) and returns the corresponding encoding
 * @param input - The bytes to check for BOM
 * @returns The encoding ('utf-8', 'utf-16le', 'utf-16be'), or null if no BOM found
 */
export function getBOMEncoding(input: ArrayBufferLike | ArrayBufferView): 'utf-8' | 'utf-16le' | 'utf-16be' | null;

/**
 * Legacy hook for decoding bytes using optional encoding with BOM detection
 * BOM takes preference over the supplied encoding
 * Performs lossy decoding with replacement character for invalid sequences
 * @param input - The bytes to decode
 * @param fallbackEncoding - The encoding to use if no BOM detected (default: 'utf-8')
 * @returns The decoded string
 */
export function legacyHookDecode(input: ArrayBufferLike | ArrayBufferView, fallbackEncoding?: string): string;

/**
 * Converts an encoding label to its proper display name
 * @param label - The encoding label
 * @returns The proper case encoding name, or null if invalid
 */
export function labelToName(label: string): string | null;

/**
 * Text decoder for decoding bytes to strings in various encodings
 * Supports strict and lossy modes
 */
export class TextDecoder {
  /** The encoding used by this decoder */
  readonly encoding: string;
  /** Whether the decoder throws on invalid sequences */
  readonly fatal: boolean;
  /** Whether the decoder ignores byte order marks */
  readonly ignoreBOM: boolean;

  /**
   * Creates a new TextDecoder
   * @param encoding - The encoding to use (default: 'utf-8')
   * @param options - Decoder options
   * @param options.fatal - Throw on invalid sequences (default: false)
   * @param options.ignoreBOM - Ignore byte order mark (default: false)
   */
  constructor(encoding?: string, options?: { fatal?: boolean; ignoreBOM?: boolean });

  /**
   * Decodes bytes to a string
   * @param input - The bytes to decode
   * @param options - Decode options
   * @param options.stream - Whether more data will follow (default: false)
   * @returns The decoded string
   */
  decode(input?: ArrayBufferLike | ArrayBufferView, options?: { stream?: boolean }): string;

  get [Symbol.toStringTag](): 'TextDecoder';
}

/**
 * Text encoder for encoding strings to UTF-8 bytes
 */
export class TextEncoder {
  /** The encoding used by this encoder (always 'utf-8') */
  readonly encoding: 'utf-8';

  constructor();

  /**
   * Encodes a string to UTF-8 bytes
   * @param str - The string to encode
   * @returns The encoded bytes
   */
  encode(str?: string): Uint8ArrayBuffer;

  /**
   * Encodes a string into a target Uint8Array
   * @param str - The string to encode
   * @param target - The target Uint8Array to write to
   * @returns Object with read count and written count
   */
  encodeInto(str: string, target: Uint8Array): { read: number; written: number };

  get [Symbol.toStringTag](): 'TextEncoder';
}

/**
 * Transform stream wrapper for TextDecoder
 * Decodes chunks of bytes to strings
 */
export class TextDecoderStream {
  /** The encoding used by this decoder */
  readonly encoding: string;
  /** Whether the decoder throws on invalid sequences */
  readonly fatal: boolean;
  /** Whether the decoder ignores byte order marks */
  readonly ignoreBOM: boolean;
  /** Readable side of the transform stream */
  readonly readable: ReadableStream<string>;
  /** Writable side of the transform stream */
  readonly writable: WritableStream<ArrayBufferLike | ArrayBufferView>;

  /**
   * Creates a new TextDecoderStream
   * @param encoding - The encoding to use (default: 'utf-8')
   * @param options - Decoder options
   * @param options.fatal - Throw on invalid sequences (default: false)
   * @param options.ignoreBOM - Ignore byte order mark (default: false)
   */
  constructor(encoding?: string, options?: { fatal?: boolean; ignoreBOM?: boolean });

  get [Symbol.toStringTag](): 'TextDecoderStream';
}

/**
 * Transform stream wrapper for TextEncoder
 * Encodes chunks of strings to UTF-8 bytes
 */
export class TextEncoderStream {
  /** The encoding used by this encoder (always 'utf-8') */
  readonly encoding: 'utf-8';
  /** Readable side of the transform stream */
  readonly readable: ReadableStream<Uint8Array>;
  /** Writable side of the transform stream */
  readonly writable: WritableStream<string>;

  constructor();

  get [Symbol.toStringTag](): 'TextEncoderStream';
}
