# PLAN.md

This file is the authoritative todo list, implementation plan, decision log, and progress tracker for this repository.

Update this file as work proceeds. Record completed tasks, changed plans, blockers, architectural decisions, added tests, verification results, and deferred work here before or alongside related code changes.

Every 5 commits, summarize older detailed entries into a concise historical summary while preserving active todos, active decisions, and unfinished work.

## Current State

- Active work: native iOS share-sheet app on branch `ios-share-app` (see "iOS App" section below).
- Completed bugfix: fixed Chrome extension popup regressions on `main`.
  - [x] Switch preferred/default models to OpenRouter tilde-prefixed latest aliases, with `~openai/gpt-mini-latest` as the default.
  - [x] Stop the iframe from auto-expanding to screen height after popup open.
  - [x] Wire the finished-state Close button to remove the injected iframe popup.
  - [x] Show the request-details accordion on the review screen.
- Completed bugfix: filtered Chrome extension model dropdowns to OpenRouter models with image input support so screenshot requests cannot select text-only models such as `qwen/qwen3.6-max-preview`.
- Completed migration: moved the newer self-hosted Chrome extension from `node-server-chrome-shared` onto `main`, while preserving `main` as the PHP/prompt source of truth.
  - [x] Restore `PLAN.md` from `github/main` before implementation work.
  - [x] Preserve the current branch's uncommitted extension improvements with a build-verified checkpoint on `node-server-chrome-shared`.
  - [x] Use local `worktrees/main`, already at the current `github/main` tip, for implementation.
  - [x] Move/adapt the newer extension into `main`'s `chrome-extension/` layout by transplanting `packages/extension` to `chrome-extension` and `packages/shared-core` to `shared-core`.
  - [x] Align extension prompt construction, response schema, source URL handling, and multi-event behavior with the PHP flow and shared prompt policy.
  - [x] Preserve Chrome-specific screenshot handling and add screenshot-aware prompt guidance.
  - [x] Verify with extension build/checks that cover Chrome prompt-policy parity.
  - [x] Re-run PHP PHPUnit parity tests in a PHP 8+ environment.
- The main requested Presidio Theatre behavior is implemented: equal peer performances can produce multiple events/emails, while explicit instructions to focus on one date keep output to one event.
- Prompt policy is shared through `prompt/system_prompt_policy.xml` and mirrored for the Chrome extension via `chrome-extension/system_prompt_policy.xml`.
- Generated calendar files default to personal editable events, not RSVP meeting invites:
  - backend and extension avoid normal `METHOD:REQUEST`, `ATTENDEE`, `ORGANIZER`, RSVP, and needs-action semantics
  - email attachments use `text/calendar; method=PUBLISH; charset=UTF-8`
- PHPUnit is installed and configured; artifact-backed tests exist for prompt behavior, Presidio output, ICS semantics, URL detection, DI, processed debug records, environment precedence, and geocoders.
- PSR-4 autoloading is active for `Jcherniak\EmailToIcs\` under `src/`.
- Postmark, URL fetching, input normalization, URL detection, and geocoding are abstracted behind injectable interfaces/classes.
- Web handling has been moved into `src/Web/WebPage.php`; `index.php` remains a front controller plus legacy-compatible glue.
- The processed-folder debug browser is implemented, env-gated, and isolated from normal workflows.
- Processed records are gzip-compressed going forward; existing records were backed up and backfilled.
- Command-line/process environment values take precedence over `.env` throughout the app through `Jcherniak\EmailToIcs\Config\Environment`.

## iOS App (branch `ios-share-app`)

Replaces the user's Apple Shortcut "Add To Calendar With AI 2" (web page → share sheet → calendar event) with a native app under `ios/`. Shortcut behaviour it supersedes: ask for special instructions + tentative flag, scrape the URL with Firecrawl, ask an LLM for raw ICS text, open it in Quick Look.

### Decisions (agreed with the user)
- AI backend: OpenRouter only, called directly from the device (key in Keychain, model configurable, default `~openai/gpt-mini-latest`, Chrome extension priority aliases). Apple Intelligence rejected because the on-device model has a 4096-token context.
- Page content: Safari shares deliver the live DOM through the share-extension JS preprocessor. Bare URLs (Orion, Mail…) use Firecrawl first **only if a key is configured**, else an offscreen `WKWebView` rendered inside the share sheet, else a plain fetch + HTML strip. One shared cleaning script (Mozilla Readability.js, selector-heuristic fallback copied from the Chrome extension), text capped at 200k chars.
- No cheap-model cleanup pass. One extraction call on the cleaned text; if it fails or returns no events, one retry with the raw HTML (kept per job, ~1 MB cap), mirroring the Chrome extension fallback.
- Concurrency: the share extension enqueues a job in the App Group and starts a background `URLSession` upload; the first share of a batch opens the app once so it can start the Live Activity; later shares just dismiss. The app is woken on each completion (`handleEventsForBackgroundURLSession`), advances the job, geocodes with MapKit, updates the activity.
- One queue Live Activity per batch: `done/total`, weighted progress (capture 1, extraction 5, retry +5, geocode 0.5), current title/stage; tap opens the Inbox.
- Destinations: Apple Calendar via `EKEventEditViewController` (edit sheet only, sequential per event); Google Calendar via OAuth (ASWebAuthenticationSession + PKCE, user-supplied iOS client ID) with separate Confirmed/Tentative target calendars chosen in settings; ICS file built on device (one VCALENDAR, all selected VEVENTs) opened in the share sheet. Multi-event results go through an Inbox picker with all events selected by default.
- Targets: iOS 18+, iPhone + iPad, XcodeGen spec at `ios/project.yml`; bundle `com.justin-c.web-to-ics` (+ `.share`, `.widgets`), App Group `group.com.justin-c.web-to-ics`, URL scheme `webtoics`; secrets in gitignored `ios/Config/Secrets.xcconfig` (template committed).
- Platform facts verified against Apple docs: only the foreground app can start a Live Activity (extensions cannot; apps may update one from the background); an extension-started background upload survives the extension and wakes the containing app; background upload tasks deliver the response body via the data delegate; `extensionContext.open` is unreliable from share extensions, `EnvironmentValues().openURL` works.
- Layout: SwiftPM resources/fixtures must live inside the package target, so policy/custom-prompt copies and the Presidio parity fixtures live under `ios/Packages/WebToICSCore/` with `cmp` sync scripts.
- Verification scope for iOS changes: `ios/scripts/check-structure.sh` (runs anywhere: YAML/JSON/XML validity, required plist keys, `node --check`, generated-JS drift, policy/fixture sync) before every commit; `ios/scripts/verify.sh` (macOS: `swift test` on the Core package, `xcodegen generate`, simulator build) is the user's local gate because this coding environment has no Xcode or Swift toolchain. PLAN.md entries state which checks ran where.

### Commit checklist
- [x] 1. Scaffold: `project.yml`, configs, `.gitignore`, package skeleton, placeholder targets, scripts, this section.
- [x] 2. Core models, prompt builder, JSON schema, OpenRouter extractor, URL cleaner, model catalog, HTML text cleaner + tests.
- [x] 3. Core jobs, stages, background transfer, settings, Keychain + tests.
- [x] 4. Swift ICS generator with byte-parity tests against the Presidio fixtures.
- [x] 5. Cleaner JS (vendored Readability + PageCleaner + Safari shim, generated `ShareJS.js`).
- [ ] 6. Share extension (options sheet, capture tiers incl. offscreen web view, handoff).
- [ ] 7. App wake handling, stage coordinator, MapKit geocoding, Inbox UI, deep links.
- [ ] 8. Queue Live Activity.
- [ ] 9. Destinations: Apple edit sheet, ICS share sheet, Google OAuth + Calendar API.
- [ ] 10. Settings UI, model list, Firecrawl toggle, Google calendar pickers.
- [ ] 11. Docs: README, AGENTS.md, ARCHITECTURE.md, PLAN.md wrap-up.

### Device test checklist (user, recorded here when run)
1. Share 3 Safari tabs back-to-back: app opens once, all reach Ready. 2. Force-quit app, share again: background wake advances the job. 3. Activity shows `N of M · P%`, tap opens Inbox, ends ~120 s after last add, failed job keeps it open. 4. Manual dismissal → next share opens the app. 5. Apple: sequential edit sheets. 6. ICS import honours VTIMEZONE. 7. Google: calendars by tentative flag. 8. Airplane mode → Failed + Retry. 9. Orion bare URL with/without Firecrawl key. 10. Selection share prefills instructions. 11. No-events page triggers the raw-HTML retry.

### iOS verification log
- Commit 1 (scaffold): `ios/scripts/check-structure.sh` passed in the coding sandbox. `xcodegen generate`, `swift test` and the simulator build are pending on the user's Mac (no Xcode here).
- Commit 2 (Core models/prompt/schema/extractor): `check-structure.sh` incl. policy + fixture sync passed in the sandbox; 10 XCTest files written (`swift test` pending locally, no Swift toolchain in the sandbox). The iOS system prompt lives in `ios/Packages/WebToICSCore/Sources/WebToICSCore/Resources/ios_system_prompt.txt`: the shortcut's prompt rewritten for JSON output, with the shared policy XML and the Chrome custom prompt substituted at runtime.
- Commit 3 (jobs/stages/transfer/settings): `check-structure.sh` passed in the sandbox; 9 more XCTest files (store, state machine incl. raw-HTML retry, snapshot weights, settings). `swift test` pending locally. Design notes: `StageRunner` is the single state machine used by both processes; per-attempt background session identifiers `com.justin-c.web-to-ics.job.<uuid>.<stage>.<attempt>`; `activity.json` holds the batch id and tells the extension whether to open the app; job files are written atomically (temp + rename inside `NSFileCoordinator`).
- Commit 4 (ICS generator): `check-structure.sh` incl. fixture sync passed in the sandbox. Parity tests compare each generated single-event calendar with `presidio-email-{1,2,3}.expected.ics` after masking UID/DTSTAMP (PRODID set to the eluceo string for the test); VTIMEZONE blocks are compared line by line. `swift test` pending locally. Deviation kept for parity: VTIMEZONE DTSTART is the local time after each transition (as eluceo writes it).
- Commit 5 (cleaner JS): `check-structure.sh` (incl. generated-bundle drift check and `node --check` on all four JS files) passed in the sandbox. `ios/scripts/smoke-cleaner.mjs` run with jsdom against the three HTML fixtures: on the real Presidio page Readability dropped all 9 date tokens and the guard correctly fell back to the heuristic (9/9 dates kept); the two synthetic fixtures are below Readability's 500-char floor and also use the heuristic. Vendored Mozilla Readability 0.6.0 (Apache-2.0, sha256 recorded in `ios/Shared/JS/vendor/README.md`).

## Recent Verification Baseline

- Chrome extension popup bugfix verification passed: `cd chrome-extension && npm run build`; `node --check chrome-extension/settings.js`; `node --check chrome-extension/models-config.js`; `node --check chrome-extension/src/background.js`; static search confirmed stale concrete preferred-model IDs and `ResizeObserver` popup auto-resize code are absent from source and dist.
- Chrome extension image-model filter verification passed: `cd chrome-extension && npm run build`; `node --check chrome-extension/settings.js`; `node --check chrome-extension/models-config.js`; `node --check chrome-extension/src/background.js`; live OpenRouter model metadata check found 166 image-capable models out of 371 total, confirmed `qwen/qwen3.6-max-preview` is excluded and `~openai/gpt-mini-latest` is included.
- Corrected extension transplant checkpoint: `cd chrome-extension && npm run build` passed after using branch files directly with only standalone-layout compatibility edits. `shared-core` build artifacts are generated during extension build and ignored under `shared-core/dist/`.
- Additional extension checks passed: `node --check chrome-extension/email-processor.js`, `node --check chrome-extension/src/background.js`, shared prompt policy `cmp`, and static checks for `eventData`, `dtstart`, source attribution, and screenshot guidance in source/bundle.
- Full PHP verification passed with `PATH="/opt/homebrew/opt/php@8.4/bin:$PATH" vendor/bin/phpunit`: 59 tests, 183 assertions, 3 expected live-geocoder skips. Dependencies were installed with `composer install --ignore-platform-req=php` because the local `php8` target resolves to PHP 8.5.5 while `eluceo/ical` declares PHP `~8.3.0 || ~8.4.0`.
- Completed follow-up: updated outgoing ICS email bodies so the first line is a source URL link, followed by `Source data (...)` for the originating input type and `Source page (cleaned)` for fetched page content. Displayed source data now strips UTF-8 BOM bytes. Verified with `php -l index.php`, `php -l tests/EmailProcessorPromptAndEmailTest.php`, and `vendor/bin/phpunit` (59 tests, 190 assertions, 1 expected Google geocoder skip).
- Completed follow-up: added an AI geocode-location combiner so `original` location text and provider `geocoded` address can be merged into `<place name>, <full formatted address without default country>`. Defaults: `GEOCODE_COMBINE_MODEL=~anthropic/claude-haiku-latest`, `GEOCODE_DEFAULT_COUNTRY=US`. Added `OpenRouterChatClient` for shared chat-completion calls and unit tests for prompt shape, JSON fence handling, and chain geocoder integration.
- Completed follow-up: fixed Google Calendar timezone preservation by embedding `VTIMEZONE` components for timed ICS events that use named timezones such as `America/Los_Angeles`. Latest processed Presidio record showed correct AI data and `DTSTART;TZID=America/Los_Angeles`, but no matching `VTIMEZONE`, causing Google Calendar to preserve the instant while showing GMT as the editable timezone. Updated Presidio expected ICS artifacts and verified with `php -l src/Calendar/IcalGenerator.php`, `php -l tests/IcalGeneratorPersonalEventTest.php`, and `vendor/bin/phpunit` (55 tests, 167 assertions, 1 expected Google geocoder skip).
- Completed follow-up: improved OpenRouter response preview logging by trimming leading whitespace/newlines before taking the logged snippet, including URL detection responses. Generated/final ICS content is now logged to Apache logs at generation points and at `sendEmail()` so the exact outgoing attachment content is visible. Verified with `php -l index.php`, `php -l src/UrlDetection/OpenRouterUrlDetector.php`, and `vendor/bin/phpunit` (51 tests, 159 assertions, 1 expected Google skip).
- Latest full PHP verification: `vendor/bin/phpunit` passed with 59 tests, 190 assertions, and 1 expected Google geocoder skip.
- Latest focused environment/geocoder verification passed:
  - `php -l src/Config/Environment.php`
  - `php -l index.php`
  - `php -l tests/EnvironmentPrecedenceTest.php`
  - `php -l tests/GeocoderIntegrationTest.php`
  - `vendor/bin/phpunit --filter 'EnvironmentPrecedenceTest|GeocoderIntegrationTest'`
- Geocoder live status:
  - Mapbox works for `Presidio Theatre, 99 Moraga Avenue, San Francisco, CA 94129`.
  - Google currently returns `REQUEST_DENIED` because billing is not enabled on the Google Cloud project.
  - Geocoder tests skip invalid/unauthorized providers by default, but can require providers with `TESTS_REQUIRE_GEOCODER_INTEGRATION=mapbox`, `google`, comma-separated lists, `all`, or `1`.
- Prior Chrome extension checks passed when extension files changed:
  - `node --check chrome-extension/email-processor.js`
  - `npm run build` when JS/build outputs were edited.

## Durable Decisions

- `PLAN.md` is authoritative; chat history, stashes, and local memory are not durable project state.
- Every coding-agent commit must include the trailer:
  - `Assisted-by: Codex:gpt-5.5`
- Verification scope:
  - Run PHP lint/tests before PHP/backend code-changing commits.
  - Run JS syntax/build checks before Chrome extension code-changing commits.
  - Documentation-only commits do not require test runs, but must remain documentation-only.
- Environment precedence:
  - command-line/process env wins over `.env`
  - `.env` remains the repo-local fallback
  - `Environment::load()` must be used for app bootstrap dotenv loading
- Web/router:
  - Use Slim 4 (`slim/slim`, `slim/psr7`) for the webpage/router layer.
  - Keep auth local as middleware/service for now rather than adding a full auth package.
- Calendar semantics:
  - generated events are personal editable events by default
  - RSVP/invitation behavior, if ever needed, must be an explicit non-default mode
- Fetching:
  - use a chain of fetchers behind `UrlFetcherInterface`
  - production order remains direct, Oxylabs, then Scrapefly where configured
  - test fetchers should avoid live network calls
- Geocoding:
  - use `GeocoderInterface` through `ChainGeocoder`
  - default `GEOCODER_ORDER=mapbox,google`
  - if all geocoders fail, preserve original/AI event location, continue ICS/email sending, and send one diagnostic error email with provider failure details
- Processed records:
  - use gzip for processed JSON because PHP can read/write it natively
  - zstd was used for the one-time backup tarball because `/usr/bin/zstd` was available

## Completed Summary

- Established `AGENTS.md` and `PLAN.md` workflow guidance; ignored local markdown notes with `*.local.md`.
- Reset earlier exploratory implementation and used it only as historical context.
- Implemented equal-performance prompt policy and tests for:
  - Presidio Theatre three-performance output
  - explicit one-date override
  - one-primary-date page behavior
  - deterministic current-date/test seed behavior
- Added committed artifacts:
  - Presidio source HTML under `tests/artifacts/sources/`
  - artificial source fixtures for equal-performance and one-primary-date behavior
  - expected Presidio JSON/ICS/email output artifacts under `tests/artifacts/outputs/`
  - `tests/generate-artifacts.php` for regenerating expected outputs
- Abstracted Postmark into mail classes:
  - `MailerInterface`
  - `PostmarkMailer`
  - `DummyMailer`
  - `EmailMessage`
  - `EmailAttachment`
- Added fetcher abstractions:
  - `UrlFetcherInterface`
  - direct, Oxylabs, Scrapefly, chain, artifact, and dummy fetchers
- Added input-source abstractions:
  - `ProcessingInput`
  - `EmailInputSource`
  - `WebFormInputSource`
  - `CliInputSource`
  - `RawEmailTextInputSource`
- Refactored URL detection into a stack:
  - `LocalUrlDetector`
  - `OpenRouterUrlDetector`
  - fallback model support for short false-negative bodies
  - tests for BOM, URL-only bodies, directives, dashed override syntax, and model fallback
- Updated latest OpenRouter model aliases to tilde-prefixed values and preferred order:
  - `~openai/gpt-latest`
  - `~google/gemini-pro-latest`
  - `~anthropic/claude-opus-latest`
  - `~anthropic/claude-sonnet-latest`
  - `~openai/gpt-mini-latest`
  - `~google/gemini-flash-latest`
  - `~moonshotai/kimi-latest`
- Added Google Maps failure handling:
  - failures no longer block ICS sending
  - original event location is preserved
  - diagnostic error email is sent
- Added pluggable geocoders:
  - `GeocoderInterface`
  - `GeocodingResult`
  - `ChainGeocoder`
  - `MapboxGeocoder`
  - `GooglePlacesGeocoder`
- Added live geocoder tests with failable/default skip behavior and strict provider-require modes.
- Added processed-folder debug browser:
  - env-gated with `DEBUG_PROCESSED_VIEW_ENABLED`
  - index/table view
  - detail panels for processed JSON, source captures, generated JSON, and ICS
  - replay/retry action
  - current live-page iframe/link
- Added processed-folder retention/compression:
  - `MAX_PROCESSED_DIR_SIZE=100M`
  - startup cleanup
  - `.json.gz` writes
  - standalone backfill script
  - backup created at `/tmp/email-to-ics-processed-backup-20260501-084235.tar.zst`
  - backfill compressed 90 processed records
- Used external model collaboration for some tests within the requested cap; useful output was selectively integrated, and unreliable/time-out output was discarded.

## Active Backlog

- Continue keeping `vendor/bin/phpunit` green after backend/PHP changes.
- Continue keeping extension checks/build green after JS/Chrome extension changes.
- Consider adding more artifact-backed prompt-clause tests:
  - no dates anywhere
  - source URL and tracking-parameter cleanup
  - timezone inference by location
  - all-day event with no times
- Consider adding manually validated paid-fallback fetch artifacts:
  - download to temporary path first
  - validate content and size
  - only then commit under `tests/artifacts`
  - delete invalid paid fallback output immediately
- Continue reducing `index.php` over time by moving remaining core processing into PSR-4 services.
- Consider a true explicit RSVP/invitation mode only if requested; keep personal editable events as the default.

## Operational Notes

- Local `.env` should not be committed.
- `TESTS_REQUIRE_GEOCODER_INTEGRATION=mapbox vendor/bin/phpunit --filter GeocoderIntegrationTest` is the current command to require the working Mapbox provider while allowing Google to skip.
- `TESTS_REQUIRE_GEOCODER_INTEGRATION=all vendor/bin/phpunit --filter GeocoderIntegrationTest` will currently fail until Google billing/access is fixed.
- Treat `stash@{0}` only as historical context if it still exists; the clean implementation replaced the useful prompt, CLI, and multi-email work.
