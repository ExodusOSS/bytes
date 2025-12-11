import { readFileSync, readdirSync } from 'node:fs'
import { toBase64 } from '@exodus/bytes/base64.js' // eslint-disable-line @exodus/import/no-unresolved
import { utf16fromString } from '@exodus/bytes/utf16.js' // eslint-disable-line @exodus/import/no-unresolved
import { join } from 'node:path'
import assert from 'node:assert/strict'

// const splitChunks = new Set(['jis0208', 'jis0212', 'big5']) // pretty-print into chunks, non-continious anyway

const reusable = Object.entries({
  $C: ['АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'], // [[1040, 6], "Ё", [1046, 26]],
  $c: ['абвгдеёжзийклмнопрстуфхцчшщъыьэюя'], // [[1072, 6], "ё", [1078, 26]],
  $jis0208tail: [
    '纊褜鍈銈蓜俉炻昱棈鋹曻彅丨仡仼伀伃伹佖侒侊侚侔俍偀倢俿倞偆偰偂傔僴僘兊兤冝冾凬刕劜劦勀勛匀匇匤卲厓厲叝﨎咜咊咩哿喆坙坥垬埈埇﨏塚增墲夋奓奛奝奣妤妺孖寀甯寘寬尞岦岺峵崧嵓﨑嵂嵭嶸嶹巐',
    '弡弴彧德忞恝悅悊惞惕愠惲愑愷愰憘戓抦揵摠撝擎敎昀昕昻昉昮昞昤晥晗晙晴晳暙暠暲暿曺朎朗杦枻桒柀栁桄棏﨓楨﨔榘槢樰橫橆橳橾櫢櫤毖氿汜沆汯泚洄涇浯涖涬淏淸淲淼渹湜渧渼溿澈澵濵瀅瀇瀨炅炫焏',
    '焄煜煆煇凞燁燾犱犾猤猪獷玽珉珖珣珒琇珵琦琪琩琮瑢璉璟甁畯皂皜皞皛皦益睆劯砡硎硤硺礰礼神祥禔福禛竑竧靖竫箞精絈絜綷綠緖繒罇羡羽茁荢荿菇菶葈蒴蕓蕙蕫﨟薰蘒﨡蠇裵訒訷詹誧誾諟諸諶譓譿賰賴',
    '贒赶﨣軏﨤逸遧郞都鄕鄧釚釗釞釭釮釤釥鈆鈐鈊鈺鉀鈼鉎鉙鉑鈹鉧銧鉷鉸鋧鋗鋙鋐﨧鋕鋠鋓錥錡鋻﨨錞鋿錝錂鍰鍗鎤鏆鏞鏸鐱鑅鑈閒隆﨩隝隯霳霻靃靍靏靑靕顗顥飯飼餧館馞驎髙髜魵魲鮏鮱鮻鰀鵰鵫鶴鸙黑',
  ],
  $1: ['ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡ', 'ΣΤΥΦΧΨΩ'], // [[913,17],[931,7]],
  $2: ['αβγδεζηθικλμνξοπρ', 'στυφχψω'], // [[945,17],[963,7]],
  $3: ['─│┌┐┘└├┬┤┴┼━┃┏┓┛┗┣┳┫┻╋┠┯┨┷┿┝┰┥┸╂'],
  $4: ['┒┑┚┙┖┕┎┍┞┟┡┢┦┧┩┪┭┮┱┲┵┶┹┺┽┾╀╁'],
  $5: ['☆★○●◎◇◆□■△▲'],
  $6: ['☆★○●◎◇◆□■△▲', '▽▼'], // ["$5","▽▼"],
  $7: ['ヽヾゝゞ〃仝々〆〇ー'],
  $8: ['ēéěèīíǐìōóǒòūúǔùǖǘǚǜü'],
  $9: ['昞昡昢昣昤昦昩昪昫昬昮昰'], // ["昞",26145,4,"昦",26153,4,"昮昰"],
  // $a: ['弨弫弬弮弰'],
  // $b: ['‘’“”〔〕'],
  // $c: ['￢￤＇＂㈱№℡'],
  // $d: ['匥匧匨匩匫匬匭'],
}).map(([k, v]) => [k, v.join('')])

const LINELENGTH = 200
const visibleLength = (str) => {
  const u8 = Buffer.from(str, 'utf-16le')
  const u16 = new Uint16Array(u8.buffer, u8.byteOffset, u8.byteLength / 2)
  return str.length + (u16.filter((x) => x > 0x80).length * 2) / 3
}

const encodings = {}
for (const file of readdirSync(import.meta.dirname)) {
  const match = file.match(/^index-([a-z0-9-]+)\.txt$/u)
  if (!match) continue
  const encoding = match[1]
  if (encoding.endsWith('-ranges')) continue
  const non16bit = encoding === 'big5'
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
      assert.ok(code && code !== 0xff_fd, `${encoding}: ${codeHex}`) // can't be a replacement char
      if (!non16bit) assert.ok(code <= 0xff_ff, `${encoding}: ${codeHex}`) // has to be <= 16-bit
      assert.ok(code < 0xd8_00 || code >= 0xe0_00, `${encoding}: ${codeHex}`) // not a surrogate
      return [i, code]
    })

  const known = new Map(rows)
  const chars = []
  for (let i = 0; i <= max; i++) {
    if (known.has(i)) {
      chars.push(String.fromCodePoint(known.get(i)))
    } else {
      chars.push('\uFFFD')
    }
  }

  while (chars[chars.length - 1] === String.fromCodePoint(128 + chars.length - 1)) chars.pop() // minify

  encodings[encoding] = chars.join('')
}

Object.assign(encodings, Object.fromEntries(reusable))

function conseqStart(str, start) {
  const first = str[start].codePointAt(0)
  let p = start
  while (p < str.length && str[p] !== '\uFFFD' && str[p].codePointAt(0) === first + p - start) p++
  return p - start
}

const stats = new Map()

function encode(count, relcodepoint) {
  if (count === 1 && relcodepoint >= 1 && relcodepoint <= 3) return `${-relcodepoint}`
  const res = `${count},${relcodepoint}`
  stats.set(res, (stats.get(res) || 0) + 1)
  return res
}

for (const [encoding, chars] of Object.entries(encodings)) {
  const list = []
  let str = chars
  let lastconseq = 0
  while (str.length > 0) {
    if (str[0] === '\uFFFD') {
      let skip = 0
      while (str[skip] === '\uFFFD') skip++
      list.push(`0,${skip}`)
      str = str.slice(skip)
    }

    {
      let foundReusable = false
      for (const [name, v] of reusable) {
        if (name === encoding) continue
        if (str.startsWith(v)) {
          list.push(JSON.stringify(name))
          str = str.slice(v.length)
          foundReusable = true
          break
        }
      }

      if (foundReusable) continue
    }

    const lastIsStr =
      list.length > 0 &&
      typeof list[list.length - 1] === 'string' &&
      list[list.length - 1].endsWith('"')
    let minConseq = lastIsStr ? 3 : 2 // don't collapse too small chunks

    let strsplit = [...str]
    {
      const p = conseqStart(strsplit, 0)
      if (p >= minConseq) {
        const first = strsplit[0].codePointAt(0)
        list.push(encode(p, first - lastconseq))
        lastconseq = first + p
        strsplit = strsplit.slice(p)
        str = strsplit.join('')
        continue
      }
    }

    minConseq = 3

    const index = strsplit.indexOf('\uFFFD')
    // const is96 = list.length > 0 && list[list.length - 1].length > 80
    let end = index === -1 ? strsplit.length : index
    // if (splitChunks.has(encoding)) {
    //   end = index > 96 && index <= 152 && !is96 ? 76 : Math.min(96, end)
    // }

    for (const [name, v] of reusable) {
      if (name === encoding) continue
      const idx = str.indexOf(v) // FIXME
      assert.ok(idx !== 0)
      if (idx > 0) {
        const idxu = [...str.slice(0, idx)].length // eslint-disable-line unicorn/no-useless-spread
        if (idxu < end) end = idxu
      }
    }

    for (let i = 0; i < end; i++) {
      if (conseqStart(strsplit, i) >= minConseq) {
        assert.ok(i > 0)
        end = i
      }
    }

    strsplit = strsplit.slice(0, end)
    const head = strsplit.join('')
    if (strsplit.length > 6) {
      lastconseq = strsplit[strsplit.length - 1].codePointAt(0) + 1
      list.push(`"${toBase64(utf16fromString(head, 'uint8-le'))}"`)
    } else {
      let i = 0
      while (i < strsplit.length) {
        const start = strsplit[i].codePointAt(0)
        const p = conseqStart(strsplit, i)
        list.push(encode(p, start - lastconseq))
        lastconseq = start + p
        i += p
      }
    }

    str = str.slice(head.length)
  }

  const list2 = []
  let tmp = ''
  for (const x of list) {
    if (tmp.length === 0) {
      tmp = '' + x
    } else if (visibleLength(tmp + x) > LINELENGTH - 6) {
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

console.error([...stats].sort((a, b) => b[1] - a[1]))
