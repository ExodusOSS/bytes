import { decode, labelToName } from 'whatwg-encoding'

// Very trivial polyfill to test _just_ the decoder output

export function TextDecoder(label, { fatal = false } = {}) {
  return {
    decode(u8) {
      const text = decode(u8, labelToName(label))
      if (fatal && text.includes('\uFFFD')) throw new TypeError('Non-mapped data in input')
      return text
    },
  }
}
