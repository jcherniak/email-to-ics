#!/usr/bin/env bash
# Full local verification (macOS with Xcode 16+, XcodeGen and Node installed):
#   structural checks, Core package unit tests, project generation and a simulator build.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
IOS="$ROOT/ios"
[ -f "$IOS/Config/Secrets.xcconfig" ] || cp "$IOS/Config/Secrets.xcconfig.template" "$IOS/Config/Secrets.xcconfig"
"$IOS/scripts/check-structure.sh"
swift test --package-path "$IOS/Packages/WebToICSCore"
(cd "$IOS" && xcodegen generate)
xcodebuild -project "$IOS/WebToICS.xcodeproj" -scheme WebToICS \
  -destination 'generic/platform=iOS Simulator' -configuration Debug \
  CODE_SIGNING_ALLOWED=NO build | tail -n 20
echo "verify.sh passed"
