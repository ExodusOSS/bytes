const raw = require('./encodings.json')
const encodings = raw.flatMap((x) => x.encodings)
const labels = encodings.map((x) => x.name.toLowerCase())
const groups = new Map(raw.map((x) => [x.heading, x.encodings.map((x) => x.name.toLowerCase())]))
const legacySingleByte = groups.get('Legacy single-byte encodings')
const legacyMultiByte = [...groups].filter(([n]) => n.startsWith('Legacy mul')).flatMap((x) => x[1])

module.exports = { raw, encodings, labels, legacySingleByte, legacyMultiByte }
