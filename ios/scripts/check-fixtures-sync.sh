#!/usr/bin/env bash
# The Core package tests use copies of the PHP parity fixtures; they must stay identical to tests/artifacts/outputs.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FIX="$ROOT/ios/Packages/WebToICSCore/Tests/WebToICSCoreTests/Fixtures"
status=0
for name in presidio-ai-output.expected.json presidio-email-1.expected.ics presidio-email-2.expected.ics presidio-email-3.expected.ics; do
  if [ ! -f "$FIX/$name" ]; then echo "missing fixture copy: $name" >&2; status=1; continue; fi
  if cmp -s "$ROOT/tests/artifacts/outputs/$name" "$FIX/$name"; then echo "in sync: $name"; else echo "OUT OF SYNC: $name" >&2; status=1; fi
done
exit $status
