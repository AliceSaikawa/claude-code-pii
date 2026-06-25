# Claude Code PII Filter Fork

**言語**: **日本語** | [English](README-PII_EN.md)

Claude Code CLIにPII（個人情報）フィルタリング機能を追加したフォーク。
Anthropic APIに送信される全データから個人情報を検出・マスクし、レスポンス表示時に復元する。

## アーキテクチャ

```
ユーザー入力 / ツール結果 / システムプロンプト
  → 正規表現フィルタ (EMAIL, PHONE, API_KEY等)
  → Ollama 4Bフィルタ (人名, 組織名等)
  → プレースホルダ置換 ([NAME_1], [EMAIL_2]等)
  → Anthropic API
  → レスポンス受信 → プレースホルダ復元 → 表示
```

## セットアップ

```bash
# 1. Ollama + モデル
brew install ollama
brew services start ollama
ollama pull gemma3:4b

# 2. ビルド
npm install
./build-pii.sh

# 3. 実行
node dist/cli.js
```

## 設定

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

無効化: `CLAUDE_PII_FILTER=0 node dist/cli.js`

## 制限事項

- Ollama 4Bモデルの人名検出精度は完全ではない
- 新規コンテンツブロックごとに1〜2秒のレイテンシが追加される
- ソースファイル内のPIIがマスクされることで、コード生成の精度に影響が出る場合がある
