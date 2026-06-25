# Claude Code PII Filter Fork

**Language**: [日本語](README-PII.md) | **English**

A fork of Claude Code CLI with PII (Personally Identifiable Information) filtering.
Detects and masks personal information from all data sent to the Anthropic API, and restores placeholders when displaying responses.

## Architecture

```
User input / Tool results / System prompts
  → Regex filter (EMAIL, PHONE, API_KEY, etc.)
  → Ollama 4B filter (person names, org names, etc.)
  → Placeholder replacement ([NAME_1], [EMAIL_2], etc.)
  → Anthropic API
  → Response received → Placeholder restoration → Display
```

## Setup

```bash
# 1. Ollama + model
brew install ollama
brew services start ollama
ollama pull gemma3:4b

# 2. Build
npm install
./build-pii.sh

# 3. Run
node dist/cli.js
```

## Configuration

`~/.claude/pii-filter.json`:

```json
{
  "enabled": true,
  "categories": ["EMAIL","PHONE","NAME","ORG","ADDRESS","API_KEY","CREDIT_CARD","MY_NUMBER","SCHOOL"],
  "ollamaModel": "gemma3:4b",
  "ollamaEndpoint": "http://localhost:11434",
  "ollamaEnabled": true,
  "customPatterns": []
}
```

Disable: `CLAUDE_PII_FILTER=0 node dist/cli.js`

## Limitations

- Ollama 4B model accuracy for name detection is not perfect
- Adds 1-2 seconds latency per turn for new content blocks
- Code generation accuracy may be affected when PII in source files is masked
