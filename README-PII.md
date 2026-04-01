# Claude Code PII Filter Fork

Claude Code CLIにPII（個人情報）フィルタリング機能を追加したフォーク。
Anthropic APIに送信される全データから個人情報を検出・マスクし、レスポンス表示時に復元する。

## Architecture

```
ユーザー入力 / ツール結果 / システムプロンプト
  → 正規表現フィルタ (EMAIL, PHONE, API_KEY等)
  → Ollama 4Bフィルタ (人名, 組織名等)
  → プレースホルダ置換 ([NAME_1], [EMAIL_2]等)
  → Anthropic API
  → レスポンス受信 → プレースホルダ復元 → 表示
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
