// See http://stackoverflow.com/a/22747272/680742, which says that lowest limit is in Chrome, with 0xffff args
// On Hermes, actual max is 0x20_000 minus current stack depth, 1/16 of that should be safe
const maxFunctionArgs = 0x20_00

export function asciiPrefix(arr) {
  let p = 0 // verified ascii bytes
  const length = arr.length
  // Threshold tested on Hermes (worse on <=48, better on >=52)
  // Also on v8 arrs of size <=64 might be on heap and using Uint32Array on them is unoptimal
  if (length > 64) {
    // Speedup with u32
    const u32start = (4 - (arr.byteOffset & 3)) % 4 // offset start by this many bytes for alignment
    for (; p < u32start; p++) if (arr[p] >= 0x80) return p
    const u32length = ((arr.byteLength - u32start) / 4) | 0
    const u32 = new Uint32Array(arr.buffer, arr.byteOffset + u32start, u32length)
    let i = 0
    for (const u32length4 = u32length - 3; i < u32length4; p += 16, i += 4) {
      if (u32[i] & 0x80_80_80_80) break
      if (u32[i + 1] & 0x80_80_80_80) break
      if (u32[i + 2] & 0x80_80_80_80) break
      if (u32[i + 3] & 0x80_80_80_80) break
    }

    for (; i < u32length; p += 4, i++) if (u32[i] & 0x80_80_80_80) break
  }

  for (; p < length; p++) if (arr[p] >= 0x80) return p
  return length
}

// This is actually compatible with Latin1 and supports range 0-255, not just 0-127
export function decode(arr, start = 0, stop = arr.length) {
  start |= 0
  stop |= 0
  const total = stop - start
  if (total === 0) return ''
  if (total > maxFunctionArgs) {
    let prefix = ''
    for (let i = start; i < stop; ) {
      const i1 = Math.min(stop, i + maxFunctionArgs)
      prefix += String.fromCharCode.apply(String, arr.subarray(i, i1))
      i = i1
    }

    return prefix
  }

  const sliced = start === 0 && stop === arr.length ? arr : arr.subarray(start, stop)
  return String.fromCharCode.apply(String, sliced)
}

export function encodeLatin1(str) {
  const length = str.length
  const arr = new Uint8Array(length)
  for (let i = 0; i < length; i++) arr[i] = str.charCodeAt(i)
  return arr
}
