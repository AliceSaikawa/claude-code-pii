// Test Ollama PII detection (requires ollama running with gemma3:4b)
const ENDPOINT = 'http://localhost:11434'
const MODEL = 'gemma3:4b'

const SYSTEM_PROMPT = `You are a PII (Personally Identifiable Information) detector.
Extract all person names, organization names, and school/university names from the text blocks below.

Rules:
- Return ONLY a JSON array. No explanation, no markdown.
- Each item: {"text": "exact match from input", "category": "NAME"|"ORG"|"SCHOOL", "block": N}
- NAME: person names in any language (Japanese, Chinese, English, etc.)
- ORG: company names, organization names, government agency names
- SCHOOL: school names, university names, educational institution names
- Do NOT extract: file paths, function names, variable names, CLI commands, package names, programming terms, URLs, common nouns
- If no PII is found, return []
- Match the EXACT text as it appears in the input`

const testText = `---BLOCK_0---
田中太郎さんはAnthropicでエンジニアとして働いています。
彼は東京大学の出身で、以前はGoogleに勤めていました。
連絡先: tanaka@example.com

---BLOCK_1---
// config.js
const author = "山田花子"
const company = "株式会社サイバーエージェント"
`

async function main() {
  console.log('Testing Ollama PII detection...')
  console.log('Endpoint:', ENDPOINT)
  console.log('Model:', MODEL)
  console.log()

  try {
    const response = await fetch(`${ENDPOINT}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: testText },
        ],
        stream: false,
        options: { temperature: 0 },
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      console.error('HTTP error:', response.status)
      return
    }

    const data = await response.json()
    const content = data.message?.content ?? ''
    console.log('Raw response:')
    console.log(content)
    console.log()

    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('No JSON array found in response')
      return
    }

    const detections = JSON.parse(jsonMatch[0])
    console.log('Detections:')
    for (const d of detections) {
      console.log(`  [${d.category}] "${d.text}" (block ${d.block})`)
    }

    // Verify expected detections
    const expected = ['田中太郎', '山田花子', 'Anthropic', 'Google', '東京大学', '株式会社サイバーエージェント']
    const found = detections.map(d => d.text)
    console.log('\nExpected:', expected)
    console.log('Found:', found)

    const missing = expected.filter(e => !found.includes(e))
    if (missing.length > 0) {
      console.log('Missing:', missing)
    } else {
      console.log('\nAll expected PII detected!')
    }

  } catch (err) {
    if (err.name === 'TimeoutError') {
      console.error('Timeout - model may still be loading')
    } else {
      console.error('Error:', err.message)
    }
  }
}

main()
