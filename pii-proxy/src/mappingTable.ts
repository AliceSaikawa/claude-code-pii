import type { PIICategory } from './types.js'

export class MappingTable {
  private readonly originalToPlaceholder = new Map<string, string>()
  private readonly placeholderToOriginal = new Map<string, string>()
  private readonly counters = new Map<PIICategory, number>()

  register(original: string, category: PIICategory): string {
    const existing = this.originalToPlaceholder.get(original)
    if (existing) return existing

    const count = (this.counters.get(category) ?? 0) + 1
    this.counters.set(category, count)

    const placeholder = `[${category}_${count}]`
    this.originalToPlaceholder.set(original, placeholder)
    this.placeholderToOriginal.set(placeholder, original)

    return placeholder
  }

  resolve(placeholder: string): string | undefined {
    return this.placeholderToOriginal.get(placeholder)
  }

  replaceAllPlaceholders(input: string): string {
    if (this.placeholderToOriginal.size === 0) return input

    const escaped = [...this.placeholderToOriginal.keys()].map((k) =>
      k.replace(/[[\]]/g, '\\$&'),
    )
    const pattern = new RegExp(escaped.join('|'), 'g')
    return input.replace(pattern, (match) => this.placeholderToOriginal.get(match) ?? match)
  }

  clear(): void {
    this.originalToPlaceholder.clear()
    this.placeholderToOriginal.clear()
    this.counters.clear()
  }

}
