#!/usr/bin/env bash
set -euo pipefail

# Build helper for ios-share-app without regenerating Xcode projects
# Usage:
#   ./build.sh [ios|mac|maccatalyst]
# If no argument is provided, builds all three.

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJ="$ROOT_DIR/ios-share-app/EmailToICS.xcodeproj"

build_ios() {
  echo "==> Building iOS Simulator (EmailToICSApp)"
  /usr/bin/xcodebuild \
    -project "$PROJ" \
    -scheme EmailToICSApp \
    -configuration Debug \
    -destination 'generic/platform=iOS Simulator' \
    CODE_SIGNING_ALLOWED=${CODE_SIGNING_ALLOWED:-YES} \
    build
}

build_maccatalyst() {
  echo "==> Building Mac Catalyst (EmailToICSApp)"
  /usr/bin/xcodebuild \
    -project "$PROJ" \
    -scheme EmailToICSApp \
    -configuration Debug \
    -destination 'platform=macOS,variant=Mac Catalyst' \
    CODE_SIGNING_ALLOWED=${CODE_SIGNING_ALLOWED:-YES} \
    build
}

build_mac() {
  echo "==> Building macOS (EmailToICSAppMac)"
  /usr/bin/xcodebuild \
    -project "$PROJ" \
    -scheme EmailToICSAppMac \
    -configuration Debug \
    -destination 'platform=macOS' \
    CODE_SIGNING_ALLOWED=${CODE_SIGNING_ALLOWED:-YES} \
    build
}

case "${1-}" in
  ios)
    build_ios
    ;;
  mac)
    build_mac
    ;;
  maccatalyst)
    build_maccatalyst
    ;;
  "")
    build_ios
    build_maccatalyst
    build_mac
    ;;
  *)
    echo "Unknown platform: $1" >&2
    echo "Usage: $0 [ios|mac|maccatalyst]" >&2
    exit 2
    ;;
esac
