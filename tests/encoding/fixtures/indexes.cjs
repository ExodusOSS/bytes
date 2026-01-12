const raw = require('./indexes.json')

const {
  big5,
  'euc-kr': eucKr,
  gb18030,
  jis0208,
  jis0212,
  'gb18030-ranges': gb18030ranges,
  'iso-2022-jp-katakana': katakana,
  ...singleByte
} = raw
const multiByte = { big5, 'euc-kr': eucKr, gb18030, jis0208, jis0212 }

module.exports = { raw, gb18030ranges, katakana, multiByte, singleByte }
