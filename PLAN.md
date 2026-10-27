# PLAN.md

This file is the authoritative todo list, implementation plan, decision log, and progress tracker for this repository.

Update this file as work proceeds. Record completed tasks, changed plans, blockers, architectural decisions, added tests, verification results, and deferred work here before or alongside related code changes.

Every 5 commits, summarize older detailed entries into a concise historical summary while preserving active todos, active decisions, and unfinished work.

## Active Work: crawl chain, candidates, Readability, retry flow, reply-to-edit, model-driven fetch

Branch `multi-event-and-retry` (items 1-5), then branch `model-driven-fetch` (item 6) so it can be reverted independently.

| Phase | Commit | Status |
| --- | --- | --- |
| C1 Fetch chain direct -> firecrawl -> tinyfish_fetch -> tinyfish_browser; remove Oxylabs/Scrapefly/Puphpeteer | this commit | done |
| C2 Readability (node + jsdom) snippet with lightened full-HTML fallback; delete PHP 8.4-only `extractMainContent` | | todo |
| C3 Shared retry runner: per model, snippet then full on first level, full on later levels, then next model; opis validation back on | | todo |
| C4a Multi-event candidates: always-array schema, `CandidateStore` keyed state, choice email with confirm-page links, routes before auth | | todo |
| C4b Chrome extension: candidate checkbox picker in the local JS processor, Reply-To + source-url marker | | todo |
| C5 Reply-to-edit: unique Reply-To `edit-<key>@INBOUND_REPLY_DOMAIN`, stored state path with previous ICS, URL fallback from quoted email | | todo |
| C6 Model-driven fetch via tool loop (`fetch_direct`, `fetch_with_firecrawl`, `fetch_with_tinyfish`, `render_with_tinyfish_browser`) on `model-driven-fetch` | | todo |

Decisions for this work (confirmed with the owner):
- Links in emails use a random 32-hex key, no login; every link lands on a one-button confirm page (`CANDIDATE_LINKS_REQUIRE_CONFIRM=1` default) so mail scanners cannot trigger sends.
- Choice email whenever more than one candidate is returned; one candidate sends directly; `<multiple>` or `MULTI` in the incoming mail sends every candidate directly, one email per event. Email delivery never combines events into one ICS.
- TinyFish browser level uses the Agent API (pure HTTP), not a CDP driver; no screenshot from that level.
- Item 6 level 1 is a PHP `fetch_direct` function tool (not `openrouter:web_fetch`) so PHP always sees page content for emails and edits.
- Retry failure = transport error, unparseable JSON, schema-invalid JSON, zero events or missing dtstart, or model `success:false`.
- Extension keeps local processing; candidates are ported into `email-processor.js`.

C1 notes:
- `FetchResult` gained `finalUrl`, `title`, `statusCode`, `contentType` (`html`|`text`) and `toSummary()`.
- `ChainUrlFetcher` exposes `levelNames()`, `hasLevel()`, `fetchLevel()` (exceptions propagate) for the C3 runner; `fetch()` keeps first-success semantics.
- Removed `OxylabsProxyUrlFetcher`, `ScrapeflyUrlFetcher`, `PuphpeteerRenderer.php`, the dead curl/2captcha fetch methods in `index.php`, `zoon/puphpeteer` and unused `html2text/html2text`; added `symfony/process` (used by C2) explicitly. `$scrapeflyScreenshot` is now `$fetchedScreenshot`.
- New env: `FIRECRAWL_API_KEY`, `TINYFISH_API_KEY`, `FETCH_*_TIMEOUT`, `FETCH_FIRECRAWL_WAIT_MS`, `FETCH_TINYFISH_BROWSER_PROFILE` (default `stealth` because that level only runs after three cheaper levels failed).
- Firecrawl is called with `onlyMainContent:false` so the full-page tier gets the whole document; Readability (C2) does main-content extraction.
- Verified: `php -l` on touched files, `vendor/bin/phpunit` (69 tests, 3 expected geocoder skips without live keys).
- Environment notes: tests need a local `.env` (copy of `.env.template`); `chrome-extension/node_modules` is tracked in git with a darwin-arm64 esbuild binary, so on Linux run the bundle with `node_modules/@esbuild/linux-x64/bin/esbuild` or reinstall; do not commit `node_modules` changes.

## Current State

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

## Recent Verification Baseline

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
  - production order is direct, Firecrawl, TinyFish Fetch, then TinyFish browser (Agent API), each skipped when its key is missing
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
  - direct, chain, artifact, and dummy fetchers (Oxylabs/Scrapefly removed later in favor of Firecrawl/TinyFish)
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
