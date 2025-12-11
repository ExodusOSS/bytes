import { decode, labelToName } from 'whatwg-encoding'

// Very trivial polyfill to test _just_ the decoder output

export function TextDecoder(label, { fatal = false } = {}) {
  return {
    decode(u8) {
      const encoding = labelToName(label) || label
      const unicode = ['UTF-8', 'UTF-16LE', 'UTF-16BE'].includes(encoding)

      const text = decode(u8, encoding)

      if (fatal && text.includes('\uFFFD')) {
        if (unicode) {
          try {
            if (new globalThis.TextDecoder(label, { fatal: true }).decode(u8) === text) return text
          } catch {}
        }

        throw new TypeError('Non-mapped data in input')
      }

      return text
    },
  }
}
