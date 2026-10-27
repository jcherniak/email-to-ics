# Email To ICS

Email-to-ICS converts emails, URLs, and web content into calendar events and ICS files.

## iOS App (`ios/`)

A native iOS share-sheet app that replaces the "Add To Calendar With AI 2" shortcut: share a web page from Safari, Orion or any app, and the event lands in Apple Calendar, Google Calendar or an ICS file. It calls OpenRouter directly from the device (no PHP backend needed), shows one Live Activity per batch so several pages can be shared back to back, and reviews multi-event pages in an Inbox before adding.

### How a share works

1. The share extension receives the page (Safari hands over the cleaned DOM through `ShareJS.js`; other apps pass only the URL).
2. One sheet asks for special instructions, Tentative, the model and the destination, with defaults from Settings.
3. The job is written to the App Group and the extraction request is handed to a background `URLSession` upload, so the sheet closes immediately. The first share of a batch opens the app once so it can start the Live Activity; later shares stay in the browser.
4. When OpenRouter answers, iOS wakes the app in the background: the JSON events are parsed (one retry with the raw HTML if nothing was found), locations are resolved with MapKit, and the Live Activity updates.
5. Tap the activity (or open the app) to review the events with checkboxes and add them: Apple Calendar edit sheets one by one, Google Calendar inserts into the confirmed or tentative calendar, or one ICS file in the share sheet.

Bare URLs (Orion, Mail, Notes) use Firecrawl when a key is configured, otherwise the page is rendered in an offscreen web view inside the share sheet for a few seconds, falling back to a plain fetch.

### Build and run (macOS with Xcode 16+)

```bash
brew install xcodegen            # once
cp ios/Config/Secrets.xcconfig.template ios/Config/Secrets.xcconfig
# edit ios/Config/Secrets.xcconfig: DEVELOPMENT_TEAM, GOOGLE_IOS_CLIENT_ID, GOOGLE_REVERSED_CLIENT_ID
cd ios && xcodegen generate && open WebToICS.xcodeproj
```

Run the `WebToICS` scheme on a device (Live Activities and the share sheet behave differently in the Simulator). Then open Settings in the app and paste your OpenRouter API key; optionally a Firecrawl key.

Google Calendar: in Google Cloud, enable the Calendar API, create an OAuth client of type **iOS** with the app's bundle ID (`com.justin-c.web-to-ics`), and put the client ID in `Secrets.xcconfig` (`GOOGLE_REVERSED_CLIENT_ID` is the same ID with its dot-separated parts reversed). Sign in from Settings and pick the confirmed and tentative calendars.

### Verification

```bash
ios/scripts/check-structure.sh   # runs anywhere: YAML/plist keys, JSON/XML, generated JS drift, policy + fixture sync
ios/scripts/verify.sh            # macOS: the above + swift test (Core package) + xcodegen + simulator build
ios/scripts/build-js.sh          # after editing ios/Shared/JS/*: regenerates ShareExtension/ShareJS.js
```

The Core package (`ios/Packages/WebToICSCore`) is platform-agnostic Swift: models, prompt builder, JSON schema, OpenRouter/Firecrawl/Google request builders, the job state machine and an ICS generator whose tests compare byte for byte with the PHP backend's Presidio fixtures.

## Email Input Formats

Inbound email can include a URL, optional model instructions, and an optional `MULTI` flag.

### Directive Format

Use explicit directives when you want the most readable format:

```text
URL: https://example.test/event
Instructions: Focus on the May 30 performance only
MULTI
```

- `URL:` provides the page to fetch before event extraction.
- `Instructions:` provides extra extraction instructions for the model.
- `MULTI` allows multiple events when the source contains separate equal performances or sessions.

### Separator Format

You can also put the URL first, then a dashed separator, then override instructions:

```text
https://example.test/event -- Focus on the May 30 performance only.
Ignore related events listed elsewhere on the page.
```

The separator must contain at least two dashes with whitespace around it. It can be inline or on its own line. Any text after the separator is treated as override instructions for the model. This override takes precedence over an earlier `Instructions:` line if both formats are present.

URL-only messages are supported. The parser handles UTF-8 BOM-prefixed mail bodies, simple HTML bodies, and URL-only bodies with a trailing bare `?`.
