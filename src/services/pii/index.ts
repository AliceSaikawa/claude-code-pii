import type { PIICategory } from './types.js'
import { MappingTable } from './mappingTable.js'
import { getCached, setCache } from './cache.js'
import { detectRegexPII, applyReplacements } from './regexFilter.js'
import { detectOllamaPII } from './ollamaFilter.js'
import { StreamRestorer } from './streamRestorer.js'
import { loadPIIConfig, isPIIFilterEnabled } from './config.js'

export { isPIIFilterEnabled } from './config.js'
export { StreamRestorer } from './streamRestorer.js'

// Session-scoped singleton
let mappingTable = new MappingTable()

export function getMappingTable(): MappingTable {
  return mappingTable
}

export function resetSession(): void {
  mappingTable = new MappingTable()
}

export function createStreamRestorer(): StreamRestorer {
  return new StreamRestorer(mappingTable)
}

async function filterText(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return text

  // Check cache first
  const cached = getCached(text)
  if (cached !== undefined) return cached

  const config = loadPIIConfig()
  const register = (original: string, category: PIICategory) =>
    mappingTable.register(original, category)

  // Phase 1: Dictionary + Regex detection (synchronous, fast)
  const regexMatches = detectRegexPII(
    text,
    config.categories,
    config.customPatterns,
    config.dictionary,
  )
  let filtered = applyReplacements(text, regexMatches, register)

  // Phase 2: Ollama detection (async, for context-dependent PII)
  if (config.ollamaEnabled) {
    const ollamaMatches = await detectOllamaPII(
      [{ index: 0, text: filtered }],
      config.ollamaEndpoint,
      config.ollamaModel,
      config.categories,
    )

    if (ollamaMatches.length > 0) {
      const sortedMatches = [...ollamaMatches].sort(
        (a, b) => b.start - a.start,
      )
      filtered = applyReplacements(filtered, sortedMatches, register)
    }
  }

  // Cache the result
  setCache(text, filtered)
  return filtered
}

// Filter content blocks within a message
async function filterContentBlocks(
  content: string | readonly Record<string, unknown>[],
): Promise<string | Record<string, unknown>[]> {
  if (typeof content === 'string') {
    return filterText(content)
  }

  const filtered: Record<string, unknown>[] = []
  for (const block of content) {
    if (block['type'] === 'text' && typeof block['text'] === 'string') {
      filtered.push({
        ...block,
        text: await filterText(block['text'] as string),
      })
    } else if (
      block['type'] === 'tool_result' &&
      typeof block['content'] === 'string'
    ) {
      filtered.push({
        ...block,
        content: await filterText(block['content'] as string),
      })
    } else if (
      block['type'] === 'tool_result' &&
      Array.isArray(block['content'])
    ) {
      const innerBlocks = await filterContentBlocks(
        block['content'] as readonly Record<string, unknown>[],
      )
      filtered.push({ ...block, content: innerBlocks })
    } else {
      filtered.push({ ...block })
    }
  }

  return filtered
}

export async function filterMessages<
  T extends { readonly type: string; readonly message?: Record<string, unknown> },
>(messages: readonly T[]): Promise<T[]> {
  if (!isPIIFilterEnabled()) return [...messages]

  const filtered: T[] = []

  for (const msg of messages) {
    if (msg.type === 'user' && msg.message && 'content' in msg.message) {
      const filteredContent = await filterContentBlocks(
        msg.message['content'] as string | readonly Record<string, unknown>[],
      )
      filtered.push({
        ...msg,
        message: { ...msg.message, content: filteredContent },
      })
    } else {
      // Assistant messages pass through (they already contain placeholders from previous turns)
      filtered.push({ ...msg })
    }
  }

  return filtered
}

const PII_FILTER_NOTICE = `# PII Filter Active

This conversation is processed by a local PII (Personally Identifiable Information) filter.
Personal information in user messages, tool results, and this system prompt has been replaced with placeholders.

Placeholder format: [CATEGORY_N] (e.g. [NAME_1], [EMAIL_2], [ORG_1])
Categories: NAME (person names), EMAIL, PHONE, ADDRESS, ORG (organizations), SCHOOL, API_KEY, CREDIT_CARD, MY_NUMBER

Important:
- Treat placeholders as opaque references to real values. Do not try to guess the original values.
- When generating code or text, preserve placeholders exactly as-is. They will be restored to original values before displaying to the user.
- If a placeholder appears in file content or code, it represents a real value that was redacted for privacy.
- Do not mention the PII filter or placeholders to the user — they see the restored original values.`

export async function filterSystemPrompt(
  prompt: readonly string[],
): Promise<string[]> {
  if (!isPIIFilterEnabled()) return [...prompt]

  const filtered: string[] = [PII_FILTER_NOTICE]
  for (const part of prompt) {
    filtered.push(await filterText(part))
  }
  return filtered
}

export function restoreText(text: string): string {
  return mappingTable.replaceAllPlaceholders(text)
}
