export class Table {
  #data = new Map()

  add(name, row) {
    if (!row) return
    const { mean } = row
    this.#data.set(name, Math.round(1e9 / Number(mean)).toLocaleString())
  }

  print(columns) {
    const selected = columns.filter((x) => this.#data.get(x))
    console.log(selected.join('\t'))
    console.log(selected.map((x) => this.#data.get(x)).join('\t'))
  }
}
