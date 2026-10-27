#!/usr/bin/env bash
# Verifies that ShareExtension/ShareJS.js matches a fresh concatenation of its inputs and that all JS parses.
set -euo pipefail
IOS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
"$IOS_DIR/scripts/build-js.sh" "$TMP" > /dev/null
if ! cmp -s "$TMP" "$IOS_DIR/ShareExtension/ShareJS.js"; then
  echo "ShareExtension/ShareJS.js is out of date; run ios/scripts/build-js.sh" >&2
  exit 1
fi
for f in "$IOS_DIR"/Shared/JS/*.js "$IOS_DIR"/Shared/JS/vendor/*.js "$IOS_DIR/ShareExtension/ShareJS.js"; do
  node --check "$f"
done
echo "JS build check passed"
