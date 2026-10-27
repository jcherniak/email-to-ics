#!/usr/bin/env bash
# The Core package bundles byte-identical copies of the shared prompt policy and the Chrome custom prompt.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
RES="$ROOT/ios/Packages/WebToICSCore/Sources/WebToICSCore/Resources"
status=0
check() {
  if [ ! -f "$2" ]; then echo "missing copy: $2" >&2; status=1; return; fi
  if cmp -s "$1" "$2"; then echo "in sync: $(basename "$2")"; else echo "OUT OF SYNC: $2 vs $1" >&2; status=1; fi
}
check "$ROOT/prompt/system_prompt_policy.xml" "$RES/system_prompt_policy.xml"
check "$ROOT/chrome-extension/custom-prompt.default.txt" "$RES/custom-prompt.default.txt"
exit $status
