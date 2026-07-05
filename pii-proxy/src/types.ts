export const PII_CATEGORIES = [
  'EMAIL',
  'PHONE',
  'ADDRESS',
  'URL_USER',
  'API_KEY',
  'CREDIT_CARD',
  'MY_NUMBER',
  'NAME',
  'ORG',
  'SCHOOL',
  'SSN',
  'IP_ADDRESS',
  'POSTAL_CODE',
] as const

export type BuiltInPIICategory = (typeof PII_CATEGORIES)[number]
export type PIICategory = BuiltInPIICategory | (string & {})

export type CustomPatternEntry = {
  readonly name: string
  readonly pattern: string
  readonly category?: PIICategory
}

export type CustomCategoryConfig = {
  readonly name: PIICategory
  readonly label?: string
  readonly placeholder?: string
  readonly enabled?: boolean
  readonly patterns?: readonly string[]
  readonly dictionary?: readonly string[]
}

export type PIIMatch = {
  readonly text: string
  readonly category: PIICategory
  readonly start: number
  readonly end: number
}

export type DictionaryEntry = {
  readonly text: string
  readonly category: PIICategory
}

export type PIIFilterConfig = {
  readonly enabled: boolean
  readonly categories: readonly PIICategory[]
  readonly ollamaEndpoint: string
  readonly ollamaModel: string
  readonly ollamaEnabled: boolean
  readonly customPatterns: readonly CustomPatternEntry[]
  readonly customCategories: readonly CustomCategoryConfig[]
  readonly dictionary: readonly DictionaryEntry[]
  readonly allowlist: readonly string[]
}

export const DEFAULT_CONFIG: PIIFilterConfig = {
  enabled: true,
  categories: [
    'EMAIL',
    'PHONE',
    'ADDRESS',
    'API_KEY',
    'CREDIT_CARD',
    'MY_NUMBER',
    'NAME',
    'ORG',
    'SCHOOL',
    'SSN',
    'IP_ADDRESS',
    'POSTAL_CODE',
  ],
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'gemma3:4b',
  ollamaEnabled: true,
  customPatterns: [],
  customCategories: [],
  dictionary: [],
  allowlist: [],
}
