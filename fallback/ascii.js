// See http://stackoverflow.com/a/22747272/680742, which says that lowest limit is in Chrome, with 0xffff args
// On Hermes, actual max is 0x20_000 - current stack depth, 1/16 of that should be safe
const maxFunctionArgs = 0x20_00

export function decode(arr, start = 0, stop = arr.length) {
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
