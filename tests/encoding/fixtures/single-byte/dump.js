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
  let last = 127
  const deltas = chars.map((x) => {
    if (x === 0xff_fd) return x
    x -= last
    last += x
    return x
  })
  encodings[encoding] = `[${deltas.join(',')}]`
}

const table = JSON.stringify(encodings, undefined, 2)
  .replaceAll(']"', ']')
  .replaceAll('"[', '[')
  .replaceAll('"', "'")
  .replaceAll(/(\D)65533/g, '$1r')
  .replaceAll(
    /([^\dr])(1(?:,1){4,})([^\dr])/g,
    (_, a, b, c) => `${a}...e(${(b.length + 1) / 2})${c}`
  )
  .replaceAll(
    /([^\dr])(r(?:,r){4,})([^\dr])/g,
    (_, a, b, c) => `${a}...h(${(b.length + 1) / 2})${c}`
  )

console.log(table)
