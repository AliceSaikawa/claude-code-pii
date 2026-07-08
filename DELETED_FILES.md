# 削除ファイル記録

削除日: 2026-07-08  
削除コミット: 削除候補リスト (deletion-candidates.md) 承認後に実行

## カテゴリ A — README 重複ファイル（6ファイル）

| パス | 削除理由 |
|-----|---------|
| `README_CN.md` | README.md の中国語翻訳版。docs/zh/ 削除に伴い不要 |
| `README_KR.md` | README.md の韓国語翻訳版。docs/ko/ 削除に伴い不要 |
| `README_JA.md` | README.md の日本語翻訳版。README.md が日本語主体に変わったため不要 |
| `README-PII.md` | PIIフィルタ専用の日本語 README。README.md の PIIセクションに統合 |
| `README-PII_EN.md` | PIIフィルタ専用の英語 README。README.md の英語セクションに統合 |
| `QUICKSTART.md` | ビルド手順書。README.md のビルドセクションに移植して削除 |

## カテゴリ B — docs/ 多言語レポート（10ファイル）

| パス | 削除理由 |
|-----|---------|
| `docs/ko/01-텔레메트리와-프라이버시.md` | 日本語版 docs/ja/ に同内容あり |
| `docs/ko/02-숨겨진-기능과-코드네임.md` | 同上 |
| `docs/ko/03-언더커버-모드.md` | 同上 |
| `docs/ko/04-원격-제어와-킬스위치.md` | 同上 |
| `docs/ko/05-향후-로드맵.md` | 同上 |
| `docs/zh/01-遥测与隐私分析.md` | 日本語版 docs/ja/ に同内容あり |
| `docs/zh/02-隐藏功能与模型代号.md` | 同上 |
| `docs/zh/03-卧底模式分析.md` | 同上 |
| `docs/zh/04-远程控制与紧急开关.md` | 同上 |
| `docs/zh/05-未来路线图.md` | 同上 |

## 復元方法

```bash
git restore --source=HEAD~1 <パス>
# または
git show HEAD~1:<パス> > <パス>
```

## カテゴリ C — ルート未使用スタブディレクトリ・重複スクリプト・重複テスト（2026-07-08 第2弾）

### ルート未使用スタブディレクトリ

| パス | 削除理由 |
|-----|---------|
| `assistant/index.js` | `src/`・ビルドスクリプトから参照なし。KAIROS モードのスタブ |
| `bridge/peerSessions.js` | 同上。BRIDGE_MODE のスタブ |
| `coordinator/workerAgent.js` | 同上。COORDINATOR_MODE のスタブ |
| `proactive/index.js` | 同上。PROACTIVE のスタブ |
| `services/compact/reactiveCompact.js` | 同上。COMPACT のスタブ |
| `services/contextCollapse/index.js` | 同上。CONTEXT_COLLAPSE のスタブ |
| `services/contextCollapse/operations.js` | 同上。CONTEXT_COLLAPSE のスタブ |
| `services/skillSearch/featureCheck.js` | 同上。EXPERIMENTAL_SKILL_SEARCH のスタブ |
| `services/skillSearch/remoteSkillLoader.js` | 同上。EXPERIMENTAL_SKILL_SEARCH のスタブ |
| `services/skillSearch/remoteSkillState.js` | 同上。EXPERIMENTAL_SKILL_SEARCH のスタブ |
| `services/skillSearch/telemetry.js` | 同上。EXPERIMENTAL_SKILL_SEARCH のスタブ |
| `skills/mcpSkills.js` | 同上。SKILL 関連のスタブ |
| `tasks/MonitorMcpTask/MonitorMcpTask.js` | 同上。TASK 関連のスタブ |
| `tools/OverflowTestTool/OverflowTestTool.js` | 同上。各種ツールのスタブ |
| `tools/TerminalCaptureTool/prompt.js` | 同上。各種ツールのスタブ |
| `tools/TungstenTool/TungstenTool.js` | 同上。各種ツールのスタブ |
| `tools/VerifyPlanExecutionTool/constants.js` | 同上。各種ツールのスタブ |
| `tools/WorkflowTool/constants.js` | 同上。各種ツールのスタブ |
| `types/connectorText.js` | 同上。型定義のスタブ |
| `utils/attributionHooks.js` | 同上。ユーティリティのスタブ |
| `utils/systemThemeWatcher.js` | 同上。ユーティリティのスタブ |
| `utils/udsClient.js` | 同上。ユーティリティのスタブ |

### 重複・未使用ビルドスクリプト

| パス | 削除理由 |
|-----|---------|
| `scripts/stub-modules.mjs` | `package.json` の scripts から呼ばれていない。`scripts/build.mjs` に同様ロジックが内包されている |
| `scripts/transform.mjs` | `package.json` の scripts から呼ばれていない。`scripts/build.mjs` と機能が重複 |

### 重複テストファイル

| パス | 削除理由 |
|-----|---------|
| `test-ollama-pii.mjs` | `test-ollama-pii-v2.mjs` が新版で内容をカバーしている |

すべての削除ファイルは git 履歴に残る。
