#!/usr/bin/env bash
# Structural checks that run anywhere (no Xcode needed): YAML/plist/JSON/XML validity, required keys, JS syntax.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
IOS="$ROOT/ios"
cd "$ROOT"

python3 -I - "$IOS/project.yml" <<'PY'
import sys, yaml
spec = yaml.safe_load(open(sys.argv[1]))
targets = spec["targets"]
assert set(targets) == {"WebToICS", "ShareExtension", "WidgetExtension"}, targets.keys()
for name, t in targets.items():
    groups = t["entitlements"]["properties"]["com.apple.security.application-groups"]
    assert groups == ["group.com.justin-c.web-to-ics"], (name, groups)
    assert "Shared" not in [s if isinstance(s, str) else s.get("path") for s in t["sources"]], name
app = targets["WebToICS"]["info"]["properties"]
assert app["NSSupportsLiveActivities"] is True
assert "webtoics" in app["CFBundleURLTypes"][0]["CFBundleURLSchemes"]
assert "NSCalendarsWriteOnlyAccessUsageDescription" in app
share = targets["ShareExtension"]["info"]["properties"]["NSExtension"]
assert share["NSExtensionPointIdentifier"] == "com.apple.share-services"
assert share["NSExtensionAttributes"]["NSExtensionJavaScriptPreprocessingFile"] == "ShareJS"
rule = share["NSExtensionAttributes"]["NSExtensionActivationRule"]
assert rule["NSExtensionActivationSupportsWebURLWithMaxCount"] == 1
assert rule["NSExtensionActivationSupportsWebPageWithMaxCount"] == 1
widget = targets["WidgetExtension"]["info"]["properties"]["NSExtension"]
assert widget["NSExtensionPointIdentifier"] == "com.apple.widgetkit-extension"
print("project.yml ok")
PY

python3 -I - "$IOS/WebToICS/Resources/PrivacyInfo.xcprivacy" "$ROOT/prompt/system_prompt_policy.xml" <<'PY'
import sys, xml.etree.ElementTree as ET
for p in sys.argv[1:]:
    ET.parse(p)
    print("xml ok:", p.rsplit('/', 1)[-1])
PY

find "$IOS" -name '*.json' -not -path '*/node_modules/*' -print0 | xargs -0 -I{} python3 -I -c 'import json,sys; json.load(open(sys.argv[1])); print("json ok:", sys.argv[1].rsplit("/",1)[-1])' {}

for f in "$IOS/ShareExtension/ShareJS.js" "$IOS"/Shared/JS/*.js "$IOS"/Shared/JS/vendor/*.js; do
  [ -f "$f" ] || continue
  node --check "$f" && echo "js ok: $(basename "$f")"
done

if [ -f "$IOS/Shared/JS/PageCleaner.js" ]; then "$IOS/scripts/check-js-build.sh"; fi
if [ -d "$IOS/Packages/WebToICSCore/Sources/WebToICSCore/Resources" ]; then "$IOS/scripts/check-policy-sync.sh"; fi
if [ -d "$IOS/Packages/WebToICSCore/Tests/WebToICSCoreTests/Fixtures" ]; then "$IOS/scripts/check-fixtures-sync.sh"; fi
echo "structure checks passed"
