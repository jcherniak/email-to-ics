Email-to-ICS iOS Share App
================================

This iOS app lets you share a URL from any browser (Share Sheet) to “Create calendar event with AI”. It loads the page, (optionally) generates a PDF snapshot, extracts HTML, calls OpenRouter with the same structured prompt/schema as the Chrome extension, generates an ICS, and lets you send via Postmark or the iOS share sheet.

Project layout
- project.yml: XcodeGen config that creates the Xcode project with two targets:
  - EmailToICSApp (iOS app, SwiftUI)
  - CreateCalendarEventShareExtension (Share Extension)
- App/: App target sources (SwiftUI UI, processors, clients)
- ShareExtension/: Share Extension sources (minimal UI, handoff to app)
- Shared/: Shared helpers (App Group, models)

Prereqs
- Xcode 15+
- iOS 15+ target
- XcodeGen (for project generation)
  - Install: brew install xcodegen

Generate and open the project
```bash
cd ios-share-app
xcodegen generate
open EmailToICS.xcodeproj
```

First-time setup (required)
- Bundle IDs: Update bundle identifiers in project settings for both targets (App and Extension).
- App Group: Replace the placeholder `group.com.example.emailtoics` in both entitlements files with your own App Group ID and enable the App Group capability for both targets.
- URL Scheme: In App/Info.plist set a custom URL scheme (e.g., `emailtoics`). The Share Extension opens the app with `emailtoics://process-latest`.
- Permissions: Confirm ATS allows your dev hosts. OpenRouter and Postmark are HTTPS and work out of the box. If you test against `http://localhost:3000`, relax ATS for local network.

How it works
1) Share Extension receives URL/text from the Share Sheet.
2) It writes a small JSON payload into the shared App Group container and opens the host app via custom URL scheme.
3) The app loads the URL in a WKWebView, creates a PDF (best effort), extracts HTML, calls OpenRouter with the extension’s structured prompt/schema, parses the events, builds ICS, and shows a review screen.
4) You can send via Postmark or share the ICS using the iOS share UI.

Configuration in the app
- Open the app → Settings → enter:
  - OpenRouter API Key
  - Postmark API Key (optional if you just share ICS)
  - From Email
  - To Tentative/Confirmed Emails
  - Default Model (e.g., `openai/gpt-5`)

Notes and limitations
- PDF snapshots are best-effort; long pages may omit portions. The app always proceeds with HTML-only when snapshots fail.
- The Share Extension does minimal work and hands off to the app to avoid extension memory/time limits.
- Secrets are stored in UserDefaults in this starter; consider moving to Keychain for production.

Build & run on device
- Select the EmailToICSApp scheme and your device.
- On device, enable the Share Extension in the share sheet (“More” → enable “Create calendar event with AI”).

