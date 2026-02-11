import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const encodings = {}
for (const file of readdirSync(import.meta.dirname)) {
  const match = file.match(/^index-([a-z0-9-]+)\.txt$/u)
  if (!match) continue
  const encoding = match[1]
  const text = readFileSync(join(import.meta.dirname, file), 'utf8')
  const rows = text
    .split('\n')
    .map((x) => x.trim())
    .filter((x) => x && x[0] !== '#')
    .map((x) => x.split('\t'))
    .map(([istr, codeHex]) => {
      const i = Number(istr)
      assert.ok(i < 128)
      const code = parseInt(codeHex.slice(2), 16)
      assert.strictEqual(`${i}`, istr)
      assert.strictEqual('0x' + code.toString(16).padStart(4, '0').toUpperCase(), codeHex)
      assert.ok(code && code !== 0xff_fd && code <= 0xff_ff) // can't be a replacement char, has to be <= 16-bit
      assert.ok(code < 0xd8_00 || code >= 0xe0_00) // not a surrogate
      return [i, code]
    })

  const known = new Map(rows)
  const chars = []
  for (let i = 0; i < 128; i++) {
    if (known.has(i)) {
      chars.push(known.get(i))
    } else {
      chars.push(0xff_fd)
    }
  }

  while (chars[chars.length - 1] === 128 + chars.length - 1) chars.pop() // minify
  encodings[encoding] = chars
}

// Some encodings from Unicode
/*
{
  const r = 0xff_fd
  const z = (x) => new Array(x).fill(0)
  encodings['iso-8859-1'] = []
  encodings['iso-8859-9'] = [z(80),78,z(12),83,128,z(17),47,z(12),52,97].flat().map((x, i) => x === r ? r : x + i + 128)
  encodings['iso-8859-11'] = [z(33),3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,r,r,r,r,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,3424,r,r,r,r].flat().map((x, i) => x === r ? r : x + i + 128)
}
*/

for (const [encoding, chars] of Object.entries(encodings)) {
  const deltas = chars.map((x, i) => {
    if (x === 0xff_fd) return x
    return x - 128 - i
  })
  for (let i = 0; i < deltas.length; i++) {
    let j = i
    while (j < deltas.length && deltas[j] === deltas[i]) j++
    if (j - i > 2) {
      deltas.splice(i, j - i, deltas[i] === 0 ? [j - i] : [j - i, deltas[i]])
    }
  }

  encodings[encoding] = JSON.stringify(deltas)
}

const sorter = ([a], [b]) => {
  while (a[0] === b[0]) {
    a = a.slice(1)
    b = b.slice(1)
  }

  if (a && b && `${Number(a)}` === a && `${Number(b)}` === b) return Number(a) < Number(b) ? -1 : 1
  return a < b ? -1 : 1
}

const table = JSON.stringify(
  Object.fromEntries(Object.entries(encodings).sort(sorter)),
  undefined,
  2
)
  .replaceAll(']"', ']')
  .replaceAll('"[', '[')
  .replaceAll('"', "'")
  .replaceAll(/(\D)65533/g, '$1r')

console.log(table)
