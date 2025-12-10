const raw = require('./encodings.json')
const encodings = raw.flatMap((x) => x.encodings)
const labels = encodings.map((x) => x.name.toLowerCase())

module.exports = { raw, encodings, labels }
