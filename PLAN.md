# PLAN.md

This file is the authoritative todo list, implementation plan, decision log, and progress tracker for this repository.

Update this file as work proceeds. Record completed tasks, changed plans, blockers, architectural decisions, added tests, verification results, and deferred work here before or alongside related code changes.

Every 5 commits, summarize older detailed entries into a concise historical summary while preserving active todos, active decisions, and unfinished work.

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

- Completed follow-up: improved OpenRouter response preview logging by trimming leading whitespace/newlines before taking the logged snippet, including URL detection responses. Generated/final ICS content is now logged to Apache logs at generation points and at `sendEmail()` so the exact outgoing attachment content is visible. Verified with `php -l index.php`, `php -l src/UrlDetection/OpenRouterUrlDetector.php`, and `vendor/bin/phpunit` (51 tests, 159 assertions, 1 expected Google skip).
- Latest full PHP verification: `vendor/bin/phpunit` passed with 51 tests, 159 assertions, and 1 expected Google geocoder skip.
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
