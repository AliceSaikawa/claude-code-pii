import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { DEFAULT_CONFIG, type PIIFilterConfig } from './types.js'

const CONFIG_PATH = join(homedir(), '.claude', 'pii-filter.json')

let loadedConfig: PIIFilterConfig | null = null

export function loadPIIConfig(): PIIFilterConfig {
  if (loadedConfig) return loadedConfig

  // Env var override
  if (process.env['CLAUDE_PII_FILTER'] === '0') {
    loadedConfig = { ...DEFAULT_CONFIG, enabled: false }
    return loadedConfig
  }

  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    loadedConfig = {
      enabled: parsed.enabled ?? DEFAULT_CONFIG.enabled,
      categories: parsed.categories ?? DEFAULT_CONFIG.categories,
      ollamaEndpoint:
        parsed.ollamaEndpoint ?? DEFAULT_CONFIG.ollamaEndpoint,
      ollamaModel: parsed.ollamaModel ?? DEFAULT_CONFIG.ollamaModel,
      ollamaEnabled: parsed.ollamaEnabled ?? DEFAULT_CONFIG.ollamaEnabled,
      customPatterns: parsed.customPatterns ?? DEFAULT_CONFIG.customPatterns,
      dictionary: parsed.dictionary ?? DEFAULT_CONFIG.dictionary,
    }
  } catch {
    // No config file — use defaults (filter enabled)
    loadedConfig = DEFAULT_CONFIG
  }

  return loadedConfig
}

export function isPIIFilterEnabled(): boolean {
  return loadPIIConfig().enabled
}

export function resetConfig(): void {
  loadedConfig = null
}
