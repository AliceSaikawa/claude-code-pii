import type { MappingTable } from './mappingTable.js'

const PLACEHOLDER_PATTERN = /^\[[A-Z_]+_\d+\]$/
const MAX_BUFFER_LENGTH = 25

export class StreamRestorer {
  private buffer = ''

  constructor(private readonly mappingTable: MappingTable) {}

  process(delta: string): string {
    this.buffer += delta
    let output = ''

    while (this.buffer.length > 0) {
      const bracketIdx = this.buffer.indexOf('[')

      if (bracketIdx === -1) {
        output += this.buffer
        this.buffer = ''
        break
      }

      output += this.buffer.slice(0, bracketIdx)
      this.buffer = this.buffer.slice(bracketIdx)

      const closeBracketIdx = this.buffer.indexOf(']')

      if (closeBracketIdx === -1) {
        if (this.buffer.length > MAX_BUFFER_LENGTH) {
          output += this.buffer[0]
          this.buffer = this.buffer.slice(1)
        } else {
          break
        }
      } else {
        const candidate = this.buffer.slice(0, closeBracketIdx + 1)
        if (PLACEHOLDER_PATTERN.test(candidate)) {
          const resolved = this.mappingTable.resolve(candidate)
          output += resolved ?? candidate
        } else {
          output += candidate
        }
        this.buffer = this.buffer.slice(closeBracketIdx + 1)
      }
    }

    return output
  }

  flush(): string {
    const remaining = this.buffer
    this.buffer = ''
    return remaining
  }
}
