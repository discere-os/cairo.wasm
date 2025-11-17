#!/bin/bash
set -euo pipefail

BUILD_TYPE="${1:-standard}"
CLEAN="${CLEAN:-false}"
FETCH_ONLY="${FETCH_ONLY:-false}"

echo "🔨 Unified Build System for cairo.wasm"
echo "Build Type: $BUILD_TYPE"

# 1. Validate tools
command -v emcc >/dev/null 2>&1 || { echo "❌ emcc not found"; exit 1; }
command -v meson >/dev/null 2>&1 || { echo "❌ meson not found"; exit 1; }
command -v ninja >/dev/null 2>&1 || { echo "❌ ninja not found"; exit 1; }

# 2. Clean if requested
if [[ "$CLEAN" == "true" ]]; then
  rm -rf build build-* install
  echo "✅ Cleaned build artifacts"
fi

# 3. Fetch or build dependencies
if [[ -f "dependencies.json" ]]; then
  if [[ -f "scripts/fetch-dependencies.sh" ]]; then
    bash scripts/fetch-dependencies.sh || echo "⚠️  Dependency fetch failed, will build locally"
  fi
fi

if [[ "$FETCH_ONLY" == "true" ]]; then
  echo "✅ Dependencies fetched"
  exit 0
fi

# 4. Configure Meson
meson setup build \
  --cross-file=emscripten-cross.ini \
  --prefix="$(pwd)/install" \
  -Dbuildtype=release \
  -Dwasm_build_type="$BUILD_TYPE" \
  -Dlibdir=wasm \
  -Dbindir=wasm

# 5. Build
meson compile -C build

# 6. Install
meson install -C build

# 7. Post-process with wasm-opt (if available)
if command -v wasm-opt >/dev/null 2>&1; then
  for wasm_file in install/wasm/*.wasm; do
    if [[ -f "$wasm_file" ]]; then
      wasm-opt -O3 "$wasm_file" -o "$wasm_file.opt"
      mv "$wasm_file.opt" "$wasm_file"
      echo "✅ Optimized $(basename $wasm_file)"
    fi
  done
fi

# 8. Generate manifest
cat > install/wasm/manifest.json <<EOF
{
  "library": "cairo",
  "version": "$(git describe --tags --always 2>/dev/null || echo 'unknown')",
  "buildType": "$BUILD_TYPE",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "files": $(cd install/wasm && ls -1 | jq -R . | jq -s . 2>/dev/null || echo '[]')
}
EOF

echo "✅ Build complete: install/wasm/"
ls -lh install/wasm/
