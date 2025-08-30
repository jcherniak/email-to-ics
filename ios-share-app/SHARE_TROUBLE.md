# Share Sheet Troubleshooting (iOS + macOS)

This note summarizes what we changed, what worked, and what’s still failing for the iOS Share Extension showing up in Safari/Orion, plus related fixes we made while debugging.

## Current Symptom
- iOS: “Create calendar event with AI” does not appear in Safari (and Orion) share sheet top row.

## What We Changed
- Activation rule: Switched Share Extension activation to always‑eligible.
  - `ShareExtension/Info.plist` → `NSExtensionAttributes.NSExtensionActivationRule = TRUEPREDICATE`.
  - Purpose: ensure Safari/Orion don’t filter out the extension due to strict/legacy rules.

- Bundle identifiers: Fixed app/share extension bundle ID prefix mismatch to pass iOS checks.
  - Ensured iOS app ID is consistently `com.tls.email-to-ics`, and share extension is `com.tls.email-to-ics.shareext`.

- Logging & diagnostics: Added extensive os.Logger logs across pipeline (OpenRouter, WebLoader, ICS, UI, Keychain, ShareExt) for visibility.

## Other Fixes Done While Investigating
- OpenRouter JSON schema: strict json_schema rejected missing `end_time`; now `required` includes all keys with nullable types.
- Postmark 415: switched to JSON API + `X-Postmark-Server-Token`, base64 attachment.
- Image downsizing: rasterize PDF first page and iteratively reduce width/quality to ≤ 500 KB.
- “Add to Calendar”: added iOS (EventKitUI) and macOS (EventKit) flows; also a custom iOS UIActivity for the Share Sheet.
- iOS 17+ API updates: Scene phase, EventKit permission, UIWindowScene presenters.

## Simulator Crash (root cause and mitigation)
- Crash: `dyld: Library not loaded: /usr/lib/swift/libswiftWebKit.dylib` when launching under the debugger.
- Cause: Xcode injects `EmailToICSApp.debug.dylib` which links to the Swift WebKit overlay not present in your iOS 18.4/18.5 sim runtimes.
- Mitigations:
  - On Simulator, bypass WebKit and fetch via URLSession (no screenshot) to avoid linking WebKit (see `App/WebLoader.swift`).
  - For debugging: launch via `simctl` (no debugger) and attach LLDB after; or run on a physical device.

## Verification Steps (iOS device)
1) Delete any previous build of the app from the device.
2) Build & run the iOS app (not the mac app, not Catalyst).
3) Open Safari → Share → scroll top row to the end → tap “More”.
4) Find “Create calendar event with AI” and toggle it on → Done. It should now be pinned in the top row.
5) If not visible, force‑quit Safari and retry Steps 3–4.

## Why It Might Still Not Show
- First‑time extensions often require enabling under “More” in the top row (Apple caches user choices).
- If another build (with old Info.plist) was previously installed, iOS may be caching an older extension manifest.
- Device policy (MDM/Screen Time) can restrict 3rd‑party share targets.
- Rarely, the extension target was not included in the same provisioning profile or is not signed for the device.

## Quick Health Checklist
- Targets:
  - iOS app scheme is selected (EmailToICSApp), build for device.
  - “CreateCalendarEventShareExtension” is in the same project and building.
- Signing:
  - Both app and share extension use a valid team/provisioning allowing app extensions.
  - Bundle IDs: app = `com.tls.email-to-ics`, ext = `com.tls.email-to-ics.shareext`.
- Info.plist (ShareExtension):
  - `NSExtensionPointIdentifier = com.apple.share-services`.
  - `NSExtensionPrincipalClass = $(PRODUCT_MODULE_NAME).ShareViewController`.
  - `NSExtensionActivationRule = TRUEPREDICATE`.
- On device:
  - Reinstall fresh build; if missing, open Share → More → enable the extension.

## If It’s Still Missing in Safari
- Collect this info:
  - Device model + iOS version.
  - Screenshots of Share → More list (top row editor).
  - Xcode device logs while opening Share Sheet.
- Potential next tweaks (we can try in order):
  - Swap to an Action extension (bottom row) as a second point of entry (identifier `com.apple.ui-services`) in addition to Share.
  - Narrow activation rule to a predicate targeting URL/webpage types if Safari is applying hidden filters.
  - Add `NSExtensionUsageDescription` for clarity (not required, but can help UX in some contexts).

## Known Good Behaviors (Post‑Fix)
- App runs on device without dyld crashes.
- Share Sheet custom action (“Add to Calendar”) shows when sharing the .ics from our app.
- “Add to Calendar” button works directly in the app.
- OpenRouter and Postmark calls succeed with detailed logs.

## Outstanding
- Safari top‑row presence on your specific device: still not visible. We need a quick device‑side session to confirm the “More → enable” path and gather logs if it’s absent from that list.

---

## Current Session Findings (Aug 30, 2025)

### Additional Issues Discovered
- **App Launch Failure**: Share extension button appears to trigger but main app does not actually launch
- **Module Naming Issues**: Fixed `NSExtensionPrincipalClass` from using `$(PRODUCT_MODULE_NAME).ShareViewController` to hardcoded `CreateCalendarEventShareExtension.ShareViewController`
- **Storyboard Reference**: Removed `NSExtensionMainStoryboard` reference for programmatic UI
- **WebLoader Compilation**: Fixed duplicate class definitions caused by incorrect `#endif` placement

### What We Fixed This Session
1. **ShareViewController Launch Mechanism**:
   - Modified `openInApp()` method to use both `extensionContext?.open()` and responder chain fallback
   - Added proper completion handler with delay to ensure app has time to launch
   - Improved error handling and logging

2. **Activation Rules**: Updated to support specific content types instead of deprecated `TRUEPREDICATE`:
   ```xml
   <key>NSExtensionActivationRule</key>
   <dict>
       <key>NSExtensionActivationSupportsText</key>
       <true/>
       <key>NSExtensionActivationSupportsWebURLWithMaxCount</key>
       <integer>1</integer>
       <key>NSExtensionActivationSupportsWebPageWithMaxCount</key>
       <integer>1</integer>
   </dict>
   ```

3. **Build and Deployment**:
   - Successfully built both `EmailToICSApp` and `CreateCalendarEventShareExtension` schemes
   - Deployed to iPhone 16 Pro simulator (UUID: 374F64E0-67BF-4A05-A546-CAA2C73127C9)
   - App installs and runs without crashes

### Current Testing Status
- **Test URL**: `https://www.sfsymphony.org/Buy-Tickets/2024-25/SWTS25-Dolly-Parton`
- **Safari Loading**: ✅ Successfully loads Symphony page
- **Share Sheet**: ❌ Share sheet not appearing when clicking share buttons
- **Extension Visibility**: ❓ Cannot confirm if extension appears in share sheet due to interaction issues

### Simulator Interaction Challenges
- **iOS Simulator MCP Tools**: Port conflicts prevent proper UI interaction (idb server issues)
- **AppleScript Limitations**: Basic clicks work but share sheet may require more complex gestures
- **Share Button Detection**: Multiple share buttons on page (top-right "Share" and bottom Safari share icon)

### Technical Details
- **URL Scheme**: App correctly configured for `emailtoics://process-latest`
- **App Groups**: Properly configured for data sharing between app and extension
- **Bundle IDs**: 
  - App: Uses dynamic bundle ID from project settings
  - Extension: Configured as child of main app bundle
- **Simulator Environment**: iOS 18.6.2 on iPhone 16 Pro simulator

### Next Critical Steps
1. **Share Sheet Activation**: Need to successfully trigger share sheet in Safari
2. **Extension Detection**: Verify if "Create calendar event with AI" appears in share options
3. **Launch Testing**: Confirm app actually opens when extension is triggered
4. **End-to-End Flow**: Complete workflow from Safari → Share → Extension → App opens with event data

### Hypothesis for Share Sheet Issue
- Safari's share sheet may require specific user gestures or timing
- Extension may need to be manually enabled in Settings → Safari → Extensions
- iOS simulator may have limitations with share sheet interactions
- Extension might not be properly registered due to bundle ID or entitlements issues

## TL;DR Next Steps
1) Delete app from device; rebuild + run.
2) Safari → Share → More → enable "Create calendar event with AI".
3) If not listed under "More", share a URL from Safari and Orion; capture device logs; we'll try the dual Action extension fallback.
4) **URGENT**: Fix share sheet interaction in simulator or test on physical device to verify extension visibility and app launch mechanism.

