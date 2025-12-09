// From https://github.com/mathiasbynens/utf8.js/tree/master/tests, as well as data.json

export default [
  // 1-byte
  {
    codePoint: 0x00_00,
    decoded: '\0',
    encoded: '\0',
  },
  {
    codePoint: 0x00_5c,
    decoded: '\x5C',
    encoded: '\x5C',
  },
  {
    codePoint: 0x00_7f,
    decoded: '\x7F',
    encoded: '\x7F',
  },

  // 2-byte
  {
    codePoint: 0x00_80,
    decoded: '\x80',
    encoded: '\xC2\x80',
  },
  {
    codePoint: 0x05_ca,
    decoded: '\u05CA',
    encoded: '\xD7\x8A',
  },
  {
    codePoint: 0x07_ff,
    decoded: '\u07FF',
    encoded: '\xDF\xBF',
  },

  // 3-byte
  {
    codePoint: 0x08_00,
    decoded: '\u0800',
    encoded: '\xE0\xA0\x80',
  },
  {
    codePoint: 0x2c_3c,
    decoded: '\u2C3C',
    encoded: '\xE2\xB0\xBC',
  },
  {
    codePoint: 0xff_ff,
    decoded: '\uFFFF',
    encoded: '\xEF\xBF\xBF',
  },
  // unmatched surrogate halves
  // high surrogates: 0xD800 to 0xDBFF
  {
    codePoint: 0xd8_00,
    decoded: '\uD800',
    encoded: '\xED\xA0\x80',
    error: true,
  },
  {
    description: 'High surrogate followed by another high surrogate',
    decoded: '\uD800\uD800',
    encoded: '\xED\xA0\x80\xED\xA0\x80',
    error: true,
  },
  {
    description: 'High surrogate followed by a symbol that is not a surrogate',
    decoded: '\uD800A',
    encoded: '\xED\xA0\x80A',
    error: true,
  },
  {
    description:
      'Unmatched high surrogate, followed by a surrogate pair, followed by an unmatched high surrogate',
    decoded: '\uD800\uD834\uDF06\uD800',
    encoded: '\xED\xA0\x80\xF0\x9D\x8C\x86\xED\xA0\x80',
    error: true,
  },
  {
    codePoint: 0xd9_af,
    decoded: '\uD9AF',
    encoded: '\xED\xA6\xAF',
    error: true,
  },
  {
    codePoint: 0xdb_ff,
    decoded: '\uDBFF',
    encoded: '\xED\xAF\xBF',
    error: true,
  },
  // low surrogates: 0xDC00 to 0xDFFF
  {
    codePoint: 0xdc_00,
    decoded: '\uDC00',
    encoded: '\xED\xB0\x80',
    error: true,
  },
  {
    description: 'Low surrogate followed by another low surrogate',
    decoded: '\uDC00\uDC00',
    encoded: '\xED\xB0\x80\xED\xB0\x80',
    error: true,
  },
  {
    description: 'Low surrogate followed by a symbol that is not a surrogate',
    decoded: '\uDC00A',
    encoded: '\xED\xB0\x80A',
    error: true,
  },
  {
    description:
      'Unmatched low surrogate, followed by a surrogate pair, followed by an unmatched low surrogate',
    decoded: '\uDC00\uD834\uDF06\uDC00',
    encoded: '\xED\xB0\x80\xF0\x9D\x8C\x86\xED\xB0\x80',
    error: true,
  },
  {
    codePoint: 0xde_ee,
    decoded: '\uDEEE',
    encoded: '\xED\xBB\xAE',
    error: true,
  },
  {
    codePoint: 0xdf_ff,
    decoded: '\uDFFF',
    encoded: '\xED\xBF\xBF',
    error: true,
  },

  // 4-byte
  {
    codePoint: 0x01_00_00,
    decoded: '\uD800\uDC00',
    encoded: '\xF0\x90\x80\x80',
  },
  {
    codePoint: 0x01_d3_06,
    decoded: '\uD834\uDF06',
    encoded: '\xF0\x9D\x8C\x86',
  },
  {
    codePoint: 0x1_0f_ff,
    decoded: '\uDBFF\uDFFF',
    encoded: '\xF4\x8F\xBF\xBF',
  },
]
