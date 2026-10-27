#!/usr/bin/env bash
# Concatenates the vendored Readability.js, the shared PageCleaner.js and the Safari
# preprocessor shim into ShareExtension/ShareJS.js (the NSExtensionJavaScriptPreprocessingFile).
# The generated file is committed so Xcode builds need no Node; scripts/check-js-build.sh detects drift.
set -euo pipefail
IOS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$IOS_DIR/ShareExtension/ShareJS.js}"
{
  echo "// GENERATED FILE - do not edit. Built by ios/scripts/build-js.sh from"
  echo "//   Shared/JS/vendor/Readability.js (Mozilla, Apache-2.0), Shared/JS/PageCleaner.js, Shared/JS/PreprocessorShim.js"
  echo "// Edit those sources and re-run the script."
  cat "$IOS_DIR/Shared/JS/vendor/Readability.js"
  echo
  cat "$IOS_DIR/Shared/JS/PageCleaner.js"
  echo
  cat "$IOS_DIR/Shared/JS/PreprocessorShim.js"
} > "$OUT"
node --check "$OUT"
echo "wrote $OUT"
