import type { PIICategory, PIIMapping } from './types.js'

export class MappingTable {
  private readonly originalToPlaceholder = new Map<string, string>()
  private readonly placeholderToOriginal = new Map<string, string>()
  private readonly counters = new Map<PIICategory, number>()

  register(original: string, category: PIICategory): string {
    const existing = this.originalToPlaceholder.get(original)
    if (existing) {
      return existing
    }

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

  replaceAllPlaceholders(text: string): string {
    let result = text
    for (const [placeholder, original] of this.placeholderToOriginal) {
      while (result.includes(placeholder)) {
        result = result.replace(placeholder, original)
      }
    }
    return result
  }

  getMappings(): readonly PIIMapping[] {
    return Array.from(this.originalToPlaceholder.entries()).map(
      ([original, placeholder]) => {
        const match = placeholder.match(/^\[([A-Z_]+)_\d+\]$/)
        const category = (match?.[1] ?? 'NAME') as PIICategory
        return { placeholder, original, category }
      },
    )
  }

  get size(): number {
    return this.originalToPlaceholder.size
  }
}
