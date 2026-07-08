# Claude Code v2.1.88 — ソース解析 / Source Analysis

> **免責事項**: このリポジトリのソースコードはすべて **Anthropic および Claude** の知的財産です。技術研究・学習・教育目的での利用に限定して公開しています。商用利用は厳禁です。権利侵害に該当すると判断された場合は速やかに削除します。

> npm パッケージ `@anthropic-ai/claude-code` バージョン **2.1.88** から抽出。

**言語**: **日本語** | [English](#english-summary)

---

## 目次

- [PIIフィルタフォーク](#piiフィルタフォーク) — 個人情報マスク機能
- [深掘りレポート (docs/)](#深掘りレポート-docs) — テレメトリ・隠し機能・リモート制御
- [ビルド方法](#ビルド方法) — プリビルド版 / ソースビルド
- [アーキテクチャ概要](#アーキテクチャ概要) — エージェントループ構造
- [ソース統計](#ソース統計)
- [English Summary](#english-summary)

---

## PIIフィルタフォーク

Anthropic API に送信される全データから個人情報（PII）を検出・マスクし、レスポンス表示時に復元するフォーク実装。

### データフロー

```
ユーザー入力 / ツール結果 / システムプロンプト
  → 正規表現フィルタ (EMAIL, PHONE, API_KEY 等)
  → Ollama 4B フィルタ (人名, 組織名 等)
  → プレースホルダ置換 ([NAME_1], [EMAIL_2] 等)
  → Anthropic API
  → レスポンス受信 → プレースホルダ復元 → 表示
```

### セットアップ

```bash
# 1. 依存関係とビルド
npm --prefix pii-proxy install
npm --prefix pii-proxy run build

# 2. 設定ファイルを作成
node pii-proxy/dist/cli.js init

# 3. Claude Code 用の接続先を設定
node pii-proxy/dist/cli.js install --for=claude-code

# 4. プロキシを起動
node pii-proxy/dist/cli.js start
```

人名・組織名検出に Ollama を使う場合:

```bash
brew install ollama && brew services start ollama
ollama pull gemma3:4b
```

### 設定ファイル (`~/.claude/pii-filter.json`)

```json
{
  "enabled": true,
  "categories": ["EMAIL","PHONE","NAME","ORG","ADDRESS","API_KEY","CREDIT_CARD","MY_NUMBER","SCHOOL"],
  "ollamaModel": "gemma3:4b",
  "ollamaEnabled": true
}
```

### 実行時制御

```bash
node pii-proxy/dist/cli.js status
curl -X POST http://127.0.0.1:8787/control/passthrough   # フィルタ無効化
curl -X POST http://127.0.0.1:8787/control/filter        # フィルタ再有効化
curl -X POST http://127.0.0.1:8787/control/disable/PHONE # カテゴリ個別無効化
```

無効化: `CLAUDE_PII_FILTER=0 node dist/cli.js`

### 制限事項

- Ollama 4B モデルの人名検出精度は完全ではない
- 新規コンテンツブロックごとに 1〜2 秒のレイテンシが追加される
- ソースファイル内の PII がマスクされることで、コード生成の精度に影響する場合がある

---

## 深掘りレポート (docs/)

v2.1.88 デコンパイルソースに基づく分析レポート。

```
docs/
├── ja/   （日本語）
│   ├── 01-テレメトリとプライバシー.md       — 収集項目、無効化不可の理由
│   ├── 02-隠し機能とコードネーム.md        — モデルコードネーム、feature flag、内部/外部ユーザーの違い
│   ├── 03-アンダーカバーモード.md          — オープンソースでの AI 著作隠匿
│   ├── 04-リモート制御とキルスイッチ.md    — 管理設定、キルスイッチ、モデルオーバーライド
│   └── 05-今後のロードマップ.md           — Numbat、KAIROS、音声モード、未公開ツール
│
└── en/   （English）
    ├── 01-telemetry-and-privacy.md
    ├── 02-hidden-features-and-codenames.md
    ├── 03-undercover-mode.md
    ├── 04-remote-control-and-killswitches.md
    └── 05-future-roadmap.md
```

| # | トピック | 主な発見 |
|---|---------|---------|
| 01 | **テレメトリとプライバシー** | 2 系統の分析先（Anthropic 1P + Datadog）。環境フィンガープリント・プロセス統計・リポジトリハッシュを毎イベント送信。**UI から無効化不可**。`OTEL_LOG_TOOL_DETAILS=1` でツール入力の完全キャプチャが有効化。 |
| 02 | **隠し機能とコードネーム** | 動物コードネーム（Capybara v8, Tengu, Fennec=Opus 4.6, **Numbat** 次期）。Feature flag は `tengu_frond_boric` 形式の乱数単語ペアで目的を難読化。内部ユーザーは改善されたプロンプト・検証エージェント・努力アンカーを取得。隠しコマンド: `/btw`, `/stickers`。 |
| 03 | **アンダーカバーモード** | Anthropic 社員はパブリックリポジトリで自動的にアンダーカバーモードに入る。モデルへの指示: *"Do not blow your cover"* — AI 帰属を削除し、「人間の開発者として」コミット。**強制オフ手段なし**。オープンソースコミュニティの透明性に疑問を提起。 |
| 04 | **リモート制御とキルスイッチ** | `/api/claude_code/settings` を 1 時間ごとにポーリング。危険な変更はブロッキングダイアログを表示し、**拒否するとアプリが終了**。6 種以上のキルスイッチ（権限バイパス、高速モード、音声モード、分析シンク等）。GrowthBook フラグはユーザーの同意なく挙動を変更可能。 |
| 05 | **今後のロードマップ** | **Numbat** コードネーム確認済み。Opus 4.7 / Sonnet 4.8 開発中。**KAIROS** = `<tick>` ハートビート・プッシュ通知・PR サブスクリプション付き完全自律エージェントモード。音声モード（プッシュトゥトーク）実装済みだが feature flag でゲート。未公開ツール 17 件。 |

---

## ビルド方法

### Option A: プリビルド版を使う（推奨）

```bash
node cli.js --version              # → 2.1.88
node cli.js -p "Hello Claude"      # 非インタラクティブモード

# グローバルインストール:
npm install -g .
claude --version
```

**認証**: `ANTHROPIC_API_KEY` 環境変数を設定するか `node cli.js login` を実行。

### Option B: ソースからビルド（ベストエフォート）

```bash
# 前提: Node.js >= 18, npm >= 9

npm install --save-dev esbuild
node scripts/build.mjs
node dist/cli.js --version
```

**ビルドスクリプトの処理内容**

| フェーズ | 内容 |
|---------|------|
| コピー | `src/` → `build-src/` |
| 変換 | `feature('X')` → `false`（dead code elimination 向け） |
| 変換 | `MACRO.VERSION` → `'2.1.88'` |
| 変換 | `import from 'bun:bundle'` → スタブ import |
| バンドル | esbuild で欠落モジュールを反復スタブ化しながらバンドル |

**既知の制限**: Bun コンパイル時 intrinsic（`feature()`, `MACRO`, `bun:ffi`）を esbuild で完全再現できないため、約 108 件の feature-gated モジュールはスタブになる。

### Option C: Bun でフルビルド（Anthropic 内部アクセスが必要）

```bash
# 実際のビルドは Bun バンドラのコンパイル時 feature flag を使用:
# bun build src/entrypoints/cli.tsx \
#   --define:feature='(flag) => flag === "SOME_FLAG"' \
#   --define:MACRO.VERSION='"2.1.88"' \
#   --target=bun --outfile=dist/cli.js
#
# 内部ビルド設定は npm パッケージに含まれないため、Anthropic 内部リポジトリへのアクセスが必要。
```

---

## アーキテクチャ概要

```
                    THE CORE LOOP
                    =============

    User --> messages[] --> Claude API --> response
                                          |
                                stop_reason == "tool_use"?
                               /                          \
                             yes                           no
                              |                             |
                        execute tools                    return text
                        append tool_result
                        loop back -----------------> messages[]
```

エントリポイント → クエリエンジン → ツール/サービス/状態 の 3 層構造。詳細は [docs/ja/](docs/ja/) を参照。

**ツール一覧（40+ built-in）**

| カテゴリ | ツール |
|---------|-------|
| ファイル操作 | FileReadTool, FileEditTool, FileWriteTool, NotebookEditTool |
| 検索 | GlobTool, GrepTool, ToolSearchTool |
| 実行 | BashTool, PowerShellTool |
| Web | WebFetchTool, WebSearchTool |
| エージェント | AgentTool, SendMessageTool, TaskCreate/Update/Get/List/Stop/Output |
| MCP | MCPTool, ListMcpResourcesTool, ReadMcpResourceTool |
| プランニング | EnterPlanModeTool, ExitPlanModeTool, TodoWriteTool |
| ワークツリー | EnterWorktreeTool, ExitWorktreeTool |

---

## ソース統計

| 項目 | 数値 |
|-----|------|
| ソースファイル (.ts/.tsx) | ~1,884 |
| コード行数 | ~512,664 |
| 最大ファイル | `query.ts` (~785KB) |
| ビルトインツール | ~40+ |
| スラッシュコマンド | ~80+ |
| 依存パッケージ | ~192 |
| ランタイム | Bun (Node.js >= 18 バンドル) |

---

## English Summary

**Claude Code v2.1.88** — Decompiled TypeScript source extracted from `@anthropic-ai/claude-code@2.1.88` on npm.

This fork adds a **PII proxy** that intercepts all data sent to the Anthropic API, masks personal information (email, phone, names, etc.) using regex + Ollama LLM, and restores placeholders in responses before display.

**Deep analysis reports** (EN): [docs/en/](docs/en/)

| Report | Key Finding |
|--------|------------|
| [Telemetry & Privacy](docs/en/01-telemetry-and-privacy.md) | 2 analytics sinks, no UI opt-out |
| [Hidden Features & Codenames](docs/en/02-hidden-features-and-codenames.md) | Animal codenames, obfuscated feature flags |
| [Undercover Mode](docs/en/03-undercover-mode.md) | AI authorship hidden in open-source repos |
| [Remote Control](docs/en/04-remote-control-and-killswitches.md) | Hourly polling, 6+ killswitches, reject = app exits |
| [Future Roadmap](docs/en/05-future-roadmap.md) | Numbat, KAIROS autonomous mode, 17 unreleased tools |

**Build**: Run `node cli.js` directly (pre-built), or `node scripts/build.mjs` for best-effort source build (requires Node.js >= 18, esbuild). Full rebuild requires Bun and Anthropic-internal build config.

---

## ライセンス

ソースコードの著作権はすべて **Anthropic および Claude** に帰属します。本リポジトリは技術研究・教育目的のみに限定されます。商用利用は禁止されています。
