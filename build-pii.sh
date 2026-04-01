#!/bin/bash
# Build Claude Code with PII Filter
set -e

cd "$(dirname "$0")"

# ── Phase 1: Dependencies ──────────────────────────────────────────────────
echo "Installing runtime dependencies..."
npm install --save \
  commander@13.1.0 @commander-js/extra-typings@13.1.0 \
  @anthropic-ai/sdk @modelcontextprotocol/sdk \
  @alcalzone/ansi-tokenize @growthbook/growthbook \
  @opentelemetry/api @opentelemetry/api-logs @opentelemetry/core @opentelemetry/resources \
  @opentelemetry/sdk-logs @opentelemetry/sdk-metrics @opentelemetry/sdk-trace-base \
  @opentelemetry/semantic-conventions \
  ajv asciichart auto-bind axios bidi-js chalk chokidar cli-boxes code-excerpt \
  diff emoji-regex env-paths execa figures fuse.js get-east-asian-width \
  https-proxy-agent ignore indent-string jsonc-parser lodash-es lru-cache marked \
  p-map picomatch qrcode react react-reconciler semver shell-quote signal-exit \
  stack-utils strip-ansi supports-hyperlinks tree-kill usehooks-ts \
  vscode-jsonrpc wrap-ansi ws xss zod 2>&1 | tail -3

# ── Phase 2: Prepare source ────────────────────────────────────────────────
echo "Preparing source..."
npm run prepare-src

# ── Phase 3: Patch source ──────────────────────────────────────────────────
echo "Patching..."

# Fix -d2e short flag (rejected by commander >= 13)
sed -i '' "s/'-d2e, --debug-to-stderr'/'--debug-to-stderr'/g" build-src/src/main.tsx

# Fix BROWSER_TOOLS undefined (stub package)
sed -i '' 's/BROWSER_TOOLS\.map/(BROWSER_TOOLS ?? []).map/g' \
  build-src/src/skills/bundled/claudeInChrome.ts \
  build-src/src/utils/claudeInChrome/setup.ts 2>/dev/null || true

# Fix jsonc-parser ESM imports (missing .js extensions)
JSONC_ESM="node_modules/jsonc-parser/lib/esm"
if [ -d "$JSONC_ESM" ]; then
  find "$JSONC_ESM" -name '*.js' -exec sed -i '' -E "s|from '(\./[^']+)';|from '\1.js';|g" {} +
  find "$JSONC_ESM" -name '*.js' -exec sed -i '' 's|\.js\.js|.js|g' {} +
fi

# ── Phase 4: Stub internal packages ───────────────────────────────────────
echo "Creating stubs..."

stub_pkg() {
  local pkg="$1" dir="node_modules/$1"
  mkdir -p "$dir"
  echo "{\"name\":\"$pkg\",\"version\":\"0.0.0\",\"type\":\"module\",\"main\":\"index.js\"}" > "$dir/package.json"
}

stub_pkg "@ant/claude-for-chrome-mcp"
cat > node_modules/@ant/claude-for-chrome-mcp/index.js << 'STUB'
export const BROWSER_TOOLS = undefined
export function createClaudeForChromeMcpServer() { return undefined }
export default undefined
STUB

stub_pkg "@ant/computer-use-mcp"
echo '{"name":"@ant/computer-use-mcp","version":"0.0.0","type":"module","exports":{".":"./index.js","./sentinelApps":"./sentinelApps.js","./types":"./types.js"}}' > node_modules/@ant/computer-use-mcp/package.json
cat > node_modules/@ant/computer-use-mcp/index.js << 'STUB'
export const API_RESIZE_PARAMS = {}
export const DEFAULT_GRANT_FLAGS = {}
export function bindSessionContext() {}
export function buildComputerUseTools() { return [] }
export function createComputerUseMcpServer() { return undefined }
export function targetImageSize() { return { width: 0, height: 0 } }
export default undefined
STUB
echo 'export function getSentinelCategory() { return null }' > node_modules/@ant/computer-use-mcp/sentinelApps.js
echo 'export const DEFAULT_GRANT_FLAGS = {}' > node_modules/@ant/computer-use-mcp/types.js

for pkg in "@ant/computer-use-input" "@ant/computer-use-swift"; do
  stub_pkg "$pkg"
  echo 'export default undefined' > "node_modules/$pkg/index.js"
done

stub_pkg "@anthropic-ai/sandbox-runtime"
cat > node_modules/@anthropic-ai/sandbox-runtime/index.js << 'STUB'
export class SandboxManager {}
export const SandboxRuntimeConfigSchema = {}
export class SandboxViolationStore {}
export default undefined
STUB

stub_pkg "color-diff-napi"
echo 'export class ColorDiff { diff() { return [] } }; export class ColorFile {}; export function getSyntaxTheme() { return {} }; export default undefined' > node_modules/color-diff-napi/index.js

# ── Phase 5: Build ─────────────────────────────────────────────────────────
echo "Building..."
npx esbuild "build-src/entry.ts" \
  --bundle --platform=node --target=node18 --format=esm \
  --outfile=dist/cli.js \
  --packages=external \
  --external:'bun:*' \
  --allow-overwrite --log-level=error --log-limit=0 \
  --loader:.md=text --loader:.txt=text

SIZE=$(ls -lh dist/cli.js | awk '{print $5}')
echo "Build succeeded: dist/cli.js ($SIZE)"
