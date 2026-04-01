import { createHash } from 'node:crypto'

const filterCache = new Map<string, string>()

export function getCacheKey(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

export function getCached(text: string): string | undefined {
  return filterCache.get(getCacheKey(text))
}

export function setCache(originalText: string, filteredText: string): void {
  filterCache.set(getCacheKey(originalText), filteredText)
}

export function clearCache(): void {
  filterCache.clear()
}

export function cacheSize(): number {
  return filterCache.size
}
