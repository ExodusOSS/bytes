import { labelToName, TextDecoder as TextDecoderPure } from '@exodus/bytes/encoding.js'
import iconv from 'iconv-lite'

// Very trivial polyfill to test _just_ the decoder output

export function TextDecoder(label, { fatal = false, ignoreBOM = false } = {}) {
  const encoding = labelToName(label) || label || 'UTF-8'
  return {
    decode(u8) {
      const text = iconv.decode(u8, encoding, { stripBOM: !ignoreBOM })

      if (fatal && text.includes('\uFFFD')) {
        try {
          // Some encodings can validly represent replacement char
          if (new TextDecoderPure(label, { fatal, ignoreBOM }).decode(u8) === text) return text
        } catch {}

        throw new TypeError('Non-mapped data in input')
      }

      return text
    },
  }
}
