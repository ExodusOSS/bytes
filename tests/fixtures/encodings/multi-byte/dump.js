import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const nonUTF16 = new Set(['big5']) // non-charcode codepoints + continious, processed separately

const encodings = {}
for (const file of readdirSync(import.meta.dirname)) {
  const match = file.match(/^index-([a-z0-9-]+)\.txt$/u)
  if (!match) continue
  const encoding = match[1]
  if (nonUTF16.has(encoding)) continue
  const text = readFileSync(join(import.meta.dirname, file), 'utf8')
  let max = 0
  const rows = text
    .split('\n')
    .map((x) => x.trim())
    .filter((x) => x && x[0] !== '#')
    .map((x) => x.split('\t'))
    .map(([istr, codeHex]) => {
      const i = Number(istr)
      if (i > max) max = i
      const code = parseInt(codeHex.slice(2), 16)
      assert.strictEqual(`${i}`, istr)
      assert.strictEqual('0x' + code.toString(16).padStart(4, '0').toUpperCase(), codeHex)
      assert.ok(code && code !== 0xff_fd && code <= 0xff_ff, `${encoding}: ${codeHex}`) // can't be a replacement char, has to be <= 16-bit
      assert.ok(code < 0xd8_00 || code >= 0xe0_00, `${encoding}: ${codeHex}`) // not a surrogate
      return [i, code]
    })

  const known = new Map(rows)
  const chars = []
  for (let i = 0; i <= max; i++) {
    if (known.has(i)) {
      chars.push(String.fromCharCode(known.get(i)))
    } else {
      chars.push('\uFFFD')
    }
  }

  while (chars[chars.length - 1] === String.fromCharCode(128 + chars.length - 1)) chars.pop() // minify

  encodings[encoding] = chars.join('')
}

for (const [encoding, chars] of Object.entries(encodings)) {
  const list = []
  let str = chars
  while (str.length > 0) {
    if (str[0] === '\uFFFD') {
      let skip = 0
      while (str[skip] === '\uFFFD') skip++
      list.push(skip)
      str = str.slice(skip)
    }

    const first = str[0].charCodeAt(0)
    let p = 0
    while (p < str.length && str[p] !== '\uFFFD' && str[p].charCodeAt(0) === first + p) p++
    if (p >= 7) {
      list.push(`[${first}, ${p}]`)
      str = str.slice(p)
      continue
    }

    const index = str.indexOf('\uFFFD')
    const is96 = list.length > 0 && list[0].length > 80
    const end =
      index > 96 && index <= 152 && !is96 ? 76 : Math.min(96, index === -1 ? str.length : index)
    const head = str.slice(0, end)
    list.push(
      JSON.stringify(head).replace(/[^\\\w\n\p{N}\p{L}\p{S}\p{P} -]/gu, (x) => {
        const c = x.codePointAt(0)
        // if (c <= 0xff) return `\\x${c.toString(16).padStart(2, '0').toUpperCase()}`
        if (c <= 0xff_ff) return `\\u${c.toString(16).padStart(4, '0').toUpperCase()}`
        throw new Error('Unexpected')
      })
    )
    str = str.slice(end)
  }

  console.log(`const ${encoding} = [\n  ${list.join(',\n  ')}\n]\n`)
}
