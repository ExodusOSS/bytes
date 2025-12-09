// Cosmjs has reverse naming, which also makes sense, but we follow Buffer logic
import {
  utf8fromString as utf8toString,
  utf8toString as utf8fromStrings,
  utf8toStringLoose as utf8fromStringl,
} from '@exodus/bytes/utf8.js'
import { describe, it, expect } from '@exodus/test/jest'

const utf8fromString = (s, loose = false) => (loose ? utf8fromStringl(s) : utf8fromStrings(s))

describe('utf8', () => {
  it('encodes ascii strings', () => {
    expect(utf8toString('')).toEqual(new Uint8Array([]))
    expect(utf8toString('abc')).toEqual(new Uint8Array([0x61, 0x62, 0x63]))
    expect(utf8toString(' ?=-n|~+-*/\\')).toEqual(
      new Uint8Array([0x20, 0x3f, 0x3d, 0x2d, 0x6e, 0x7c, 0x7e, 0x2b, 0x2d, 0x2a, 0x2f, 0x5c])
    )
  })

  it('decodes ascii string', () => {
    expect(utf8fromString(new Uint8Array([]))).toEqual('')
    expect(utf8fromString(new Uint8Array([0x61, 0x62, 0x63]))).toEqual('abc')
    expect(
      utf8fromString(
        new Uint8Array([0x20, 0x3f, 0x3d, 0x2d, 0x6e, 0x7c, 0x7e, 0x2b, 0x2d, 0x2a, 0x2f, 0x5c])
      )
    ).toEqual(' ?=-n|~+-*/\\')
  })

  it('encodes null character', () => {
    expect(utf8toString('\u0000')).toEqual(new Uint8Array([0x00]))
  })

  it('decodes null byte', () => {
    expect(utf8fromString(new Uint8Array([0x00]))).toEqual('\u0000')
  })

  it('encodes Basic Multilingual Plane strings', () => {
    expect(utf8toString('ö')).toEqual(new Uint8Array([0xc3, 0xb6]))
    expect(utf8toString('¥')).toEqual(new Uint8Array([0xc2, 0xa5]))
    expect(utf8toString('Ф')).toEqual(new Uint8Array([0xd0, 0xa4]))
    expect(utf8toString('ⱴ')).toEqual(new Uint8Array([0xe2, 0xb1, 0xb4]))
    expect(utf8toString('ⵘ')).toEqual(new Uint8Array([0xe2, 0xb5, 0x98]))
  })

  it('decodes Basic Multilingual Plane strings', () => {
    expect(utf8fromString(new Uint8Array([0xc3, 0xb6]))).toEqual('ö')
    expect(utf8fromString(new Uint8Array([0xc2, 0xa5]))).toEqual('¥')
    expect(utf8fromString(new Uint8Array([0xd0, 0xa4]))).toEqual('Ф')
    expect(utf8fromString(new Uint8Array([0xe2, 0xb1, 0xb4]))).toEqual('ⱴ')
    expect(utf8fromString(new Uint8Array([0xe2, 0xb5, 0x98]))).toEqual('ⵘ')
  })

  it('encodes Supplementary Multilingual Plane strings', () => {
    // U+1F0A1
    expect(utf8toString('🂡')).toEqual(new Uint8Array([0xf0, 0x9f, 0x82, 0xa1]))
    // U+1034A
    expect(utf8toString('𐍊')).toEqual(new Uint8Array([0xf0, 0x90, 0x8d, 0x8a]))
  })

  it('decodes Supplementary Multilingual Plane strings', () => {
    // U+1F0A1
    expect(utf8fromString(new Uint8Array([0xf0, 0x9f, 0x82, 0xa1]))).toEqual('🂡')
    // U+1034A
    expect(utf8fromString(new Uint8Array([0xf0, 0x90, 0x8d, 0x8a]))).toEqual('𐍊')
  })

  it('throws on invalid utf8 bytes', () => {
    // Broken UTF8 example from https://github.com/nodejs/node/issues/16894
    expect(() => utf8fromString(new Uint8Array([0xf0, 0x80, 0x80]))).toThrow()
  })

  describe('utf8fromString', () => {
    it('replaces characters in lossy mode', () => {
      expect(utf8fromString(new Uint8Array([]), true)).toEqual('')
      expect(utf8fromString(new Uint8Array([0x61, 0x62, 0x63]), true)).toEqual('abc')
      // Example from https://doc.rust-lang.org/stable/std/string/struct.String.html#method.from_utf8_lossy
      expect(
        utf8fromString(
          new Uint8Array([...utf8toString('Hello '), 0xf0, 0x90, 0x80, ...utf8toString('World')]),
          true
        )
      ).toEqual('Hello �World')
    })
  })
})
