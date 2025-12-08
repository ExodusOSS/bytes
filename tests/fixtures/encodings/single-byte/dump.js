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
      const code = parseInt(codeHex.slice(2), 16)
      assert.strictEqual(`${i}`, istr)
      assert.strictEqual('0x' + code.toString(16).padStart(4, '0').toUpperCase(), codeHex)
      assert.ok(code && code !== 0xff_fd && code <= 0xff_ff) // can't be a replacement char, has to be <= 16-bit
      return [i, code]
    })

  const known = new Map(rows)
  const chars = []
  for (let i = 0; i < 128; i++) {
    if (known.has(i)) {
      chars.push(String.fromCharCode(known.get(i)))
    } else {
      chars.push('\uFFFD')
    }
  }

  while (chars[chars.length - 1] === String.fromCharCode(128 + chars.length - 1)) chars.pop() // minify

  encodings[encoding] = chars.join('')
}

const table = JSON.stringify(encodings, undefined, 2)
  .replaceAll('\uFFFD', '\\uFFFD')
  .replace(/[^\\\w\n\p{N}\p{L}\p{S}\p{P} -]/gu, (x) => {
    const c = x.codePointAt(0)
    if (c <= 0xff) return `\\x${c.toString(16).padStart(2, '0').toUpperCase()}`
    if (c <= 0xff_ff) return `\\u${c.toString(16).padStart(4, '0').toUpperCase()}`
    throw new Error('Unexpected')
  })
  .replaceAll(/(\\uFFFD){2,}/g, (x) => `" + "\\uFFFD".repeat(${x.length / 6}) + "`)
  .replaceAll(') + ""', ')')

console.log(table)
