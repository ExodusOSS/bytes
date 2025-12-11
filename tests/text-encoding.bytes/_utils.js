export function fromBits(str) {
  if (str.length % 8 !== 0) throw new Error('Can not')
  const res = new Uint8Array(str.length / 8)
  for (let i = 0; i < res.length; i++) res[i] = parseInt(str.slice(8 * i, 8 * i + 8), 2)
  return res
}

export function fromBase4(str) {
  if (str.length % 4 !== 0) throw new Error('Can not')
  const res = new Uint8Array(str.length / 4)
  for (let i = 0; i < res.length; i++) res[i] = parseInt(str.slice(4 * i, 4 * i + 4), 4)
  return res
}
