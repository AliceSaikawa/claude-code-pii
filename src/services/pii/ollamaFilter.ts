import type { PIICategory, PIIMatch } from './types.js'

type OllamaDetection = {
  text: string
  category: 'NAME' | 'ORG' | 'SCHOOL'
  block: number
}

const OLLAMA_CATEGORIES: ReadonlySet<PIICategory> = new Set([
  'NAME',
  'ORG',
  'SCHOOL',
])

const SYSTEM_PROMPT = `You are a PII detector. Extract person names, organization names, and school names from the text.

Output: JSON array only. No markdown fences, no explanation.
Format: [{"text": "exact name", "category": "NAME"|"ORG"|"SCHOOL", "block": N}]

NAME rules:
- Extract the name WITHOUT honorifics/suffixes. "田中太郎さん" → "田中太郎", "Mr. Smith" → "Smith", "鈴木先生" → "鈴木"
- Include full names and family names: 田中太郎, 山田, John Smith, 李明
- Include usernames/handles that are clearly personal identifiers
- Do NOT extract: pronouns (彼, she), generic roles (エンジニア, manager)

ORG rules:
- Company names: Google, Anthropic, 株式会社サイバーエージェント, Meta, OpenAI
- Government agencies: 総務省, FBI, 厚生労働省
- Non-profits, foundations, teams
- Include tech companies, startups, and well-known organizations
- Do NOT extract: product names (Chrome, React), programming terms, package names

SCHOOL rules:
- Universities: 東京大学, MIT, Stanford University
- Schools: 開成高校, 灘中学校
- Do NOT extract: online course platforms, generic "school"

EXCLUDE from all categories:
- File paths, URLs, email addresses (already handled by regex)
- Function names, variable names, CLI commands
- Strings that are already wrapped in [BRACKETS]
- Common nouns, adjectives, generic terms

If no PII found, return []`

const TIMEOUT_MS = 15_000
const MAX_BATCH_CHARS = 3500

// Japanese honorifics to strip from detected names
const JP_HONORIFICS = /(?:さん|さま|様|殿|氏|先生|くん|君|ちゃん|先輩|後輩|部長|課長|社長|会長|教授|博士)$/

export async function detectOllamaPII(
  blocks: readonly { readonly index: number; readonly text: string }[],
  endpoint: string,
  model: string,
  enabledCategories: readonly PIICategory[],
): Promise<readonly PIIMatch[]> {
  const categorySet = new Set(enabledCategories)
  const hasOllamaCategory = [...OLLAMA_CATEGORIES].some(c => categorySet.has(c))
  if (!hasOllamaCategory || blocks.length === 0) return []

  const chunks = chunkBlocks(blocks, MAX_BATCH_CHARS)
  const allMatches: PIIMatch[] = []

  for (const chunk of chunks) {
    const matches = await detectChunk(chunk, endpoint, model)
    allMatches.push(...matches)
  }

  return allMatches
}

function chunkBlocks(
  blocks: readonly { readonly index: number; readonly text: string }[],
  maxChars: number,
): readonly (readonly { readonly index: number; readonly text: string }[])[] {
  const chunks: { readonly index: number; readonly text: string }[][] = []
  let current: { readonly index: number; readonly text: string }[] = []
  let currentLen = 0

  for (const block of blocks) {
    if (currentLen + block.text.length > maxChars && current.length > 0) {
      chunks.push(current)
      current = []
      currentLen = 0
    }
    current.push(block)
    currentLen += block.text.length
  }

  if (current.length > 0) chunks.push(current)
  return chunks
}

async function detectChunk(
  blocks: readonly { readonly index: number; readonly text: string }[],
  endpoint: string,
  model: string,
): Promise<readonly PIIMatch[]> {
  const userPrompt = blocks
    .map(b => `---BLOCK_${b.index}---\n${b.text}`)
    .join('\n')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        options: { temperature: 0, num_predict: 1024 },
      }),
      signal: controller.signal,
    })

    if (!response.ok) return []

    const data = (await response.json()) as { message?: { content?: string } }
    const content = data.message?.content ?? ''

    return parseDetections(content, blocks)
  } catch {
    return []
  } finally {
    clearTimeout(timeout)
  }
}

function parseDetections(
  content: string,
  blocks: readonly { readonly index: number; readonly text: string }[],
): readonly PIIMatch[] {
  const matches: PIIMatch[] = []

  // Strip markdown code fences if present
  const cleaned = content
    .replace(/^```(?:json)?\s*\n?/m, '')
    .replace(/\n?```\s*$/m, '')
    .trim()

  const jsonMatch = cleaned.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  let detections: OllamaDetection[]
  try {
    detections = JSON.parse(jsonMatch[0])
  } catch {
    return []
  }

  if (!Array.isArray(detections)) return []

  for (const det of detections) {
    if (!det.text || !det.category) continue
    if (!['NAME', 'ORG', 'SCHOOL'].includes(det.category)) continue

    // Skip if it looks like an email or URL (already handled by regex)
    if (det.text.includes('@') || det.text.startsWith('http')) continue
    // Skip if already a placeholder
    if (/^\[[A-Z_]+_\d+\]$/.test(det.text)) continue

    // Post-process: strip Japanese honorifics from names
    let text = det.text
    if (det.category === 'NAME') {
      text = stripHonorifics(text)
    }
    if (text.length === 0) continue

    const block = blocks.find(b => b.index === det.block)
    if (!block) continue

    // Find all occurrences in the block
    let searchStart = 0
    while (true) {
      const idx = block.text.indexOf(text, searchStart)
      if (idx === -1) break

      matches.push({
        text,
        category: det.category as PIICategory,
        start: idx,
        end: idx + text.length,
      })
      searchStart = idx + text.length
    }
  }

  return matches
}

function stripHonorifics(name: string): string {
  return name.replace(JP_HONORIFICS, '').trim()
}
