import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const nonUTF16 = new Set(['big5']) // non-charcode codepoints + continious, processed separately
const splitChunks = new Set(['jis0208', 'gb18030']) // pretty-print into chunks, non-continious anyway

const reusable = Object.entries({
  $CYR: ['АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'], // [[1040, 6], "Ё", [1046, 26]],
  $cyr: ['абвгдеёжзийклмнопрстуфхцчшщъыьэюя'], // [[1072, 6], "ё", [1078, 26]],
  $jis0208tail: [
    '纊褜鍈銈蓜俉炻昱棈鋹曻彅丨仡仼伀伃伹佖侒侊侚侔俍偀倢俿倞偆偰偂傔僴僘兊兤冝冾凬刕劜劦勀勛匀匇匤卲厓厲叝﨎咜咊咩哿喆坙坥垬埈埇﨏塚增墲夋奓奛奝奣妤妺孖寀甯寘寬尞岦岺峵崧嵓﨑嵂嵭嶸嶹巐',
    '弡弴彧德忞恝悅悊惞惕愠惲愑愷愰憘戓抦揵摠撝擎敎昀昕昻昉昮昞昤晥晗晙晴晳暙暠暲暿曺朎朗杦枻桒柀栁桄棏﨓楨﨔榘槢樰橫橆橳橾櫢櫤毖氿汜沆汯泚洄涇浯涖涬淏淸淲淼渹湜渧渼溿澈澵濵瀅瀇瀨炅炫焏',
    '焄煜煆煇凞燁燾犱犾猤猪獷玽珉珖珣珒琇珵琦琪琩琮瑢璉璟甁畯皂皜皞皛皦益睆劯砡硎硤硺礰礼神祥禔福禛竑竧靖竫箞精絈絜綷綠緖繒罇羡羽茁荢荿菇菶葈蒴蕓蕙蕫﨟薰蘒﨡蠇裵訒訷詹誧誾諟諸諶譓譿賰賴',
    '贒赶﨣軏﨤逸遧郞都鄕鄧釚釗釞釭釮釤釥鈆鈐鈊鈺鉀鈼鉎鉙鉑鈹鉧銧鉷鉸鋧鋗鋙鋐﨧鋕鋠鋓錥錡鋻﨨錞鋿錝錂鍰鍗鎤鏆鏞鏸鐱鑅鑈閒隆﨩隝隯霳霻靃靍靏靑靕顗顥飯飼餧館馞驎髙髜魵魲鮏鮱鮻鰀鵰鵫鶴鸙黑',
  ],
}).map(([k, v]) => [k, v.join('')])

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

function conseqStart(str, start) {
  const first = str[start].charCodeAt(0)
  let p = start
  while (p < str.length && str[p] !== '\uFFFD' && str[p].charCodeAt(0) === first + p - start) p++
  return p - start
}

const minConseq = 6 // don't collapse too small chunks

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

    {
      let foundReusable = false
      for (const [name, v] of reusable) {
        if (str.startsWith(v)) {
          list.push(JSON.stringify(name))
          str = str.slice(v.length)
          foundReusable = true
          break
        }
      }

      if (foundReusable) continue
    }

    {
      const p = conseqStart(str, 0)
      if (p >= minConseq) {
        const first = str[0].charCodeAt(0)
        list.push(`[${first},${p}]`)
        str = str.slice(p)
        continue
      }
    }

    const index = str.indexOf('\uFFFD')
    const is96 = list.length > 0 && list[list.length - 1].length > 80
    let end = index === -1 ? str.length : index
    if (splitChunks.has(encoding)) {
      end = index > 96 && index <= 152 && !is96 ? 76 : Math.min(96, end)
    }

    for (const [, v] of reusable) {
      const idx = str.indexOf(v)
      assert.ok(idx !== 0)
      if (idx > 0 && idx < end) end = idx
    }

    for (let i = 0; i < end; i++) {
      if (conseqStart(str, i) >= minConseq) {
        assert.ok(i > 0)
        end = i
      }
    }

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

  const list2 = []
  const LINELENGTH = 130
  let tmp = ''
  for (const x of list) {
    if (tmp.length === 0) {
      tmp = x
    } else if (tmp.length + x.length > LINELENGTH - 6) {
      list2.push(tmp)
      tmp = x
    } else {
      tmp += ',' + x
    }
  }

  if (tmp.length > 0) list2.push(tmp)

  const dump = list2.join(',\n    ')
  console.log(`const ${encoding} = [\n    ${dump}\n]\n`)
}
