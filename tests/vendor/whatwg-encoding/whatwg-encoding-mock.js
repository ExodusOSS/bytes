import * as api from '@exodus/bytes/encoding.js'

// prettier-ignore
const supported = [
  'UTF-8',
  'IBM866',
  'ISO-8859-2', 'ISO-8859-3', 'ISO-8859-4', 'ISO-8859-5', 'ISO-8859-6', 'ISO-8859-7', 'ISO-8859-8',
  'ISO-8859-10', 'ISO-8859-13', 'ISO-8859-14', 'ISO-8859-15', 'ISO-8859-16',
  'KOI8-R', 'KOI8-U',
  'macintosh',
  'windows-874', 'windows-1250', 'windows-1251', 'windows-1252', 'windows-1253',
  'windows-1254', 'windows-1255', 'windows-1256', 'windows-1257', 'windows-1258',
  'GBK', 'gb18030', 'Big5', 'EUC-JP', 'Shift_JIS', 'EUC-KR',
  'UTF-16BE', 'UTF-16LE',
  'x-user-defined',
]

const set = new Set(supported)
const map = new Map(supported.map((x) => [x.toLowerCase(), x]))

export const isSupported = (encoding) => set.has(encoding)

export const labelToName = (label) => {
  const enc = api.normalizeEncoding(label)
  return (enc && map.get(enc)) || null
}

export function decode(input, fallbackEncoding) {
  if (fallbackEncoding !== undefined) {
    if (!isSupported(fallbackEncoding)) throw new RangeError('Unsupported encoding')
    fallbackEncoding = fallbackEncoding.toLowerCase()
  }

  return api.legacyHookDecode(input, fallbackEncoding)
}

export function getBOMEncoding(input) {
  let res = api.getBOMEncoding(input)
  if (res) res = res.toUpperCase()
  return res
}
