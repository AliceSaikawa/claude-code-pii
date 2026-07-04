import type { IncomingMessage } from 'node:http'

export function normalizeHeaderValue(
  value: string | readonly string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = item.trim()
      if (normalized) return normalized
    }
    return undefined
  }

  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized ? normalized : undefined
}

export function readHeader(
  req: IncomingMessage,
  headerNames: readonly string[],
): string | undefined {
  for (const headerName of headerNames) {
    const normalized = normalizeHeaderValue(req.headers[headerName])
    if (normalized) return normalized
  }
  return undefined
}
