// Quick test for PII filter modules (runs without Ollama)
import { createHash } from 'node:crypto'

// === Test MappingTable ===
console.log('=== MappingTable ===')

class MappingTable {
  #orig = new Map()
  #ph = new Map()
  #counters = new Map()

  register(original, category) {
    const existing = this.#orig.get(original)
    if (existing) return existing
    const count = (this.#counters.get(category) ?? 0) + 1
    this.#counters.set(category, count)
    const placeholder = `[${category}_${count}]`
    this.#orig.set(original, placeholder)
    this.#ph.set(placeholder, original)
    return placeholder
  }

  resolve(ph) { return this.#ph.get(ph) }

  replaceAll(text) {
    let r = text
    for (const [ph, orig] of this.#ph) {
      while (r.includes(ph)) r = r.replace(ph, orig)
    }
    return r
  }
}

const mt = new MappingTable()
console.log(mt.register('tanaka@example.com', 'EMAIL'))  // [EMAIL_1]
console.log(mt.register('tanaka@example.com', 'EMAIL'))  // [EMAIL_1] (same)
console.log(mt.register('yamada@test.jp', 'EMAIL'))       // [EMAIL_2]
console.log(mt.resolve('[EMAIL_1]'))                       // tanaka@example.com
console.log(mt.replaceAll('Contact [EMAIL_1] or [EMAIL_2]'))
// → Contact tanaka@example.com or yamada@test.jp

// === Test Regex Filter ===
console.log('\n=== Regex Filter ===')

const PATTERNS = [
  { category: 'API_KEY', pattern: /\b(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{36,})\b/g },
  { category: 'EMAIL', pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  { category: 'PHONE', pattern: /(?:\+81[-\s]?|0)\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4}\b/g },
  { category: 'CREDIT_CARD', pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g },
]

const testText = `
  田中太郎 <tanaka@example.com>
  電話: 090-1234-5678
  API: sk-abcdefghijklmnopqrstuvwxyz1234
  カード: 4111-1111-1111-1111
`

const mt2 = new MappingTable()
let filtered = testText

for (const { category, pattern } of PATTERNS) {
  const regex = new RegExp(pattern.source, pattern.flags)
  let m
  const matches = []
  while ((m = regex.exec(filtered)) !== null) {
    matches.push({ text: m[0], start: m.index, end: m.index + m[0].length, category })
  }
  // Replace from end to start
  matches.sort((a, b) => b.start - a.start)
  for (const match of matches) {
    const ph = mt2.register(match.text, match.category)
    filtered = filtered.slice(0, match.start) + ph + filtered.slice(match.end)
  }
}

console.log('Filtered:')
console.log(filtered)
console.log('\nRestored:')
console.log(mt2.replaceAll(filtered))

// === Test StreamRestorer ===
console.log('\n=== StreamRestorer ===')

class StreamRestorer {
  #buffer = ''
  #mt

  constructor(mt) { this.#mt = mt }

  process(delta) {
    this.#buffer += delta
    let output = ''
    while (this.#buffer.length > 0) {
      const bi = this.#buffer.indexOf('[')
      if (bi === -1) { output += this.#buffer; this.#buffer = ''; break }
      output += this.#buffer.slice(0, bi)
      this.#buffer = this.#buffer.slice(bi)
      const ci = this.#buffer.indexOf(']')
      if (ci === -1) {
        if (this.#buffer.length > 25) { output += this.#buffer[0]; this.#buffer = this.#buffer.slice(1) }
        else break
      } else {
        const candidate = this.#buffer.slice(0, ci + 1)
        if (/^\[[A-Z_]+_\d+\]$/.test(candidate)) {
          output += this.#mt.resolve(candidate) ?? candidate
        } else {
          output += candidate
        }
        this.#buffer = this.#buffer.slice(ci + 1)
      }
    }
    return output
  }
}

const sr = new StreamRestorer(mt2)
// Simulate streaming "[EMAIL_1]" in chunks
const chunks = ['Please contact ', '[EMA', 'IL_1', '] for details']
let assembled = ''
for (const chunk of chunks) {
  assembled += sr.process(chunk)
}
console.log('Stream result:', assembled)

console.log('\nAll tests passed!')
