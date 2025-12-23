import * as api from '@exodus/bytes/encoding.js'

// prettier-ignore
const supported = new Set([
  'UTF-8', 'UTF-16BE', 'UTF-16LE',
  'IBM866', 'KOI8-R', 'KOI8-U',
  'ISO-8859-2', 'ISO-8859-3', 'ISO-8859-4', 'ISO-8859-5', 'ISO-8859-6', 'ISO-8859-7', 'ISO-8859-8',
  'ISO-8859-10', 'ISO-8859-13', 'ISO-8859-14', 'ISO-8859-15', 'ISO-8859-16',
  'macintosh',
  'windows-874', 'windows-1250', 'windows-1251', 'windows-1252', 'windows-1253',
  'windows-1254', 'windows-1255', 'windows-1256', 'windows-1257', 'windows-1258',
  'GBK', 'gb18030', 'Big5', 'EUC-JP', 'Shift_JIS', 'EUC-KR',
  'x-user-defined',
])

export const isSupported = (encoding) => supported.has(encoding)

export const labelToName = (label) => {
  const name = api.labelToName(label)
  return supported.has(name) ? name : null
}

export function decode(input, fallbackEncoding) {
  if (fallbackEncoding !== undefined && !isSupported(fallbackEncoding)) {
    throw new RangeError('Unsupported encoding')
  }

  return api.legacyHookDecode(input, fallbackEncoding)
}

export function getBOMEncoding(input) {
  return api.labelToName(api.getBOMEncoding(input))
}
