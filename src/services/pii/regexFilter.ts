import type { DictionaryEntry, PIICategory, PIIMatch } from './types.js'

type PatternDef = {
  readonly category: PIICategory
  readonly pattern: RegExp
  readonly validate?: (match: string) => boolean
  readonly captureGroup?: number // use capture group N instead of full match
}

function luhnCheck(digits: string): boolean {
  const nums = digits.replace(/\D/g, '')
  let sum = 0
  let alternate = false
  for (let i = nums.length - 1; i >= 0; i--) {
    let n = parseInt(nums[i]!, 10)
    if (alternate) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alternate = !alternate
  }
  return sum % 10 === 0
}

const PATTERNS: readonly PatternDef[] = [
  // API keys — check before general alphanumeric patterns
  {
    category: 'API_KEY',
    pattern:
      /\b(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{36,}|gho_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,}|AKIA[0-9A-Z]{16}|xox[bpras]-[A-Za-z0-9\-]{10,}|sk-ant-[A-Za-z0-9\-]{20,})\b/g,
  },

  // Email
  {
    category: 'EMAIL',
    pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/g,
  },

  // Credit card (16 digits with optional separators + Luhn check)
  {
    category: 'CREDIT_CARD',
    pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    validate: luhnCheck,
  },

  // My Number (Japanese 12-digit individual number)
  {
    category: 'MY_NUMBER',
    pattern: /\b\d{4}[-\s]\d{4}[-\s]\d{4}\b/g,
  },

  // Japanese phone numbers
  {
    category: 'PHONE',
    pattern:
      /(?:\+81[-\s]?|0)\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4}\b/g,
  },

  // International phone numbers
  {
    category: 'PHONE',
    pattern: /\+\d{1,3}[-\s]\d{1,14}(?:[-\s]\d{1,14}){0,4}\b/g,
  },

  // Japanese address (heuristic)
  {
    category: 'ADDRESS',
    pattern:
      /(?:北海道|東京都|(?:大阪|京都)府|.{2,3}県).{1,8}(?:市|区|町|村|郡).{1,20}?(?:\d{1,4}[-ー]\d{1,4}(?:[-ー]\d{1,4})?|[一二三四五六七八九十百]+丁目)/g,
  },

  // URL with embedded username/credentials
  {
    category: 'URL_USER',
    pattern: /https?:\/\/[^\s/@]+:[^\s/@]+@[^\s/]+/g,
  },

  // Git Author/Committer line: "Author: Full Name <email>"
  {
    category: 'NAME',
    pattern: /(?:Author|Committer):\s+(.+?)\s+<[^>]+>/g,
    captureGroup: 1,
  },
]


export function detectRegexPII(
  text: string,
  enabledCategories: readonly PIICategory[],
  customPatterns: readonly { readonly name: string; readonly pattern: string }[] = [],
  dictionary: readonly DictionaryEntry[] = [],
): readonly PIIMatch[] {
  const categorySet = new Set(enabledCategories)
  const matches: PIIMatch[] = []

  for (const def of PATTERNS) {
    if (!categorySet.has(def.category)) continue

    const regex = new RegExp(def.pattern.source, def.pattern.flags)
    let m: RegExpExecArray | null
    while ((m = regex.exec(text)) !== null) {
      const group = def.captureGroup ?? 0
      const matchText = m[group] ?? m[0]
      if (def.validate && !def.validate(matchText)) continue

      // For capture groups, calculate the actual start position
      const start = group > 0 && m[group]
        ? m.index + m[0].indexOf(m[group]!)
        : m.index

      matches.push({
        text: matchText,
        category: def.category,
        start,
        end: start + matchText.length,
      })
    }
  }

  // Dictionary matches (exact string lookup — runs before custom patterns)
  for (const entry of dictionary) {
    if (!categorySet.has(entry.category)) continue
    let searchStart = 0
    while (true) {
      const idx = text.indexOf(entry.text, searchStart)
      if (idx === -1) break
      matches.push({
        text: entry.text,
        category: entry.category,
        start: idx,
        end: idx + entry.text.length,
      })
      searchStart = idx + entry.text.length
    }
  }

  // Custom patterns
  for (const custom of customPatterns) {
    try {
      const regex = new RegExp(custom.pattern, 'g')
      let m: RegExpExecArray | null
      while ((m = regex.exec(text)) !== null) {
        matches.push({
          text: m[0],
          category: 'NAME', // custom patterns default to NAME category
          start: m.index,
          end: m.index + m[0].length,
        })
      }
    } catch {
      // Invalid regex in config — skip silently
    }
  }

  // Sort by position descending for safe replacement (end to start)
  return [...matches].sort((a, b) => b.start - a.start)
}

export function applyReplacements(
  text: string,
  matches: readonly PIIMatch[],
  register: (original: string, category: PIICategory) => string,
): string {
  // matches must be sorted by start descending
  let result = text
  const seen = new Set<string>()

  for (const match of matches) {
    const key = `${match.start}:${match.end}`
    if (seen.has(key)) continue
    seen.add(key)

    const placeholder = register(match.text, match.category)
    result =
      result.slice(0, match.start) + placeholder + result.slice(match.end)
  }

  return result
}
