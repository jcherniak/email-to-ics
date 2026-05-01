# PLAN.md

This file is the authoritative todo, plan, decision log, and progress tracker for this repository.

Update this file as work proceeds. Completed work, changed plans, open questions, new decisions, and verification results should be recorded here before or alongside the related code changes.

Every 5 commits, summarize older detailed entries into a shorter historical summary so this file remains useful as a live working plan instead of becoming an unreadable transcript.

## User Prompts This Session

### Prompt 1

> look at https://www.presidiotheatre.org/show-details/opera-parallele-doubt-at-the-presidio-theatre
>
> it has 3 sessions listed
>
> override the system prompt To specify in the case of a concert like this,where there's clearly 3 separate performances of the same event,that it should send 3 separate emails with the calendar event, 1 for each date.Unless there are instructions in the email or in the input hat say otherwise.To focus on a specific date.On a page where there is clearly 1 main date,some extra ones listed, then focus on the main date as we do now.But on this page, there's no clearly no 1 primary date put instead 3 equal dates. So in this case, I expect 3 emails.

### Prompt 2

> Add a command line switch.Where you can input a test email text,and it will output he JSON without doing anything else.Use those flags to test your new prompt.And iterate until it produces the desired output.

### Prompt 3

> then i want to start creating a test suite with phpunit, so create tests for this scenario. make sure the json is in the right structure, make sure we get 3 events, make sure we generate 3 emails
>
> Since the script is date based, you'll have to add emulators to override the current date as far as the script and system prompt are concerned.You'll also have to create cache data So I want you to download the HTML of this page now and store it in a artifacts directory under tests.To create a tests folder and under that test folder create an artifacts folder And in that artifacts folder download this page so you can reference this page as HTML in your tests.Since the script is date based, you'll have to add emulators to override the current date as far as the script and system prompt are concerned.You'll also have to create cache data So I want you to download the HTML of this page now and store it in a artifacts directory under tests.To create a tests folder and under that test folder create an artifacts folder And in that artifacts folder download this page so you can reference this page as HTML in your tests.
>
> add whatecer other tests are helpful.

### Prompt 4

> abstract postmark into its own class so you can use dependency injection to replace it while testing with a dummy class. add tests to ensure dssired input is there S well

### Prompt 5

> first: modify .gitignore to ignore *.local.md, then create plan.local.md and output all the prompts ive given you this session, your plan to implement them along with checkboxes and your current state of progress then stop

### Prompt 6

> then commit gitignore

### Prompt 7

> then stash your changes so far with a msg so we can come back to them. modify the plan file to recognize this

### Prompt 8

> also create artificial artifacts or ideally find live pages you can download and use as test data for various clauses in the system prompt.  if you cant sasily find a page generate skmething artificial. also use the fallback fetch process once or twice so we can test the codepaths on that.

### Prompt 9

> look through the claude/codex history for any usable urls that you can download. if using the paid fetch fallback, make sure to download first, save rhe artficact then if its not calid, delete it

### Prompt 10

> abstract this into separate parts as well such that we use dependency injection and can swap out and have a series of fetchers with a common jnterface, then a postmark sender and a dimmy one for testing and a dummy fetcher that loads an artifact file, etc

### Prompt 11

> use psr4 paths, put in the jcherniak/EmailToIcs namespace

### Prompt 12

> separate core processing from input, so email is an input, webform is an input, cli is an input (inputsource)

### Prompt 13

> then showing form and session handling, etc - the webpage is its own thing

### Prompt 14

> you can pull a small core router / auth package for the webpage. what would be good for that? answer then stop

### Prompt 15

> that works. i want you to back out all the code changes touve made, just reset to head, theb incorporate all of this into the plan file and stop

### Prompt 16

> rename plan.local.md to PLAN.md. Update agents.md / claude.md if its a symlink to say in very strong language that that file is the authorative todo and tracking list.  it should be updated as you go with things done, todos, plans, etc.  it should be committed.  every 5 commits, earlier entries should be summarizrd.  do this then commit the agents and plan and stop

### Prompt 17

> I want you to adjust the plan so you, in order
> - make system prompt changes
> - create tests with artifacts. run the models with a constant seed during testing to get consistent output.  put the testing seed as a const in the test class. do the absolute bare minimum refactor to allow for comprehensive testing.
> - refactor as specified
> - ensure rhe tests still pass
>
> dont stop until 100% complete

### Prompt 18

> and ensure that chrome extension uses new prompt, but i believe that is already hanfled. if it isnt shared already, make sure it is moving forward

### Prompt 19

> but when creating tests save under aetifacts thw source page (might be html, json, screenshot, etc) as well ad the output.  add some way you can generate the outout artifacts so theyre committed so can be compared

### Prompt 20

> as an aside, when these get added to my calendar, i have to manually accept them and i cant edit them. how can i fix both issues? answer this then stop

### Prompt 21

> ok, add that to the plan before tests and refactor

### Prompt 22

> continue work until all done.  add to the plan at the end to update the chrome extension with thesr samr method changes

## Current State

- [x] Inspected the Presidio Theatre page.
- [x] Confirmed the page lists three peer performances:
  - May 29, 2026 at 7:30 PM
  - May 30, 2026 at 7:30 PM
  - May 31, 2026 at 3:00 PM
- [x] Started prompt changes in `system_prompt.txt`, `index.php`, and `chrome-extension/email-processor.js`.
- [x] Started backend logic to split multiple event data into separate emails.
- [x] Added an initial CLI `--test-email-text` / `--test-email-file` path in `index.php`.
- [x] Ran syntax checks:
  - `php -l index.php`
  - `node --check chrome-extension/email-processor.js`
- [x] Ran one live CLI prompt test against the Presidio URL.
- [ ] Prompt behavior is not yet correct: the live AI test still returned one JSON event with the other dates in the description.
- [ ] The equal-performance auto-detection needs to be fixed or replaced with a more deterministic HTML extraction step.
- [ ] PHPUnit has not been installed/configured yet.
- [ ] Tests have not been created yet.
- [ ] The Presidio HTML artifact has not been downloaded into `tests/artifacts` yet.
- [ ] Postmark has not yet been abstracted behind a dependency-injected class.
- [x] Committed `.gitignore` update:
  - Commit: `83fd5df Ignore local markdown notes`
- [x] Stashed interrupted tracked implementation changes:
  - Stash ref at time of writing: `stash@{0}`
  - Stash message: `wip equal-performance calendar prompt and email splitting`
  - Stashed tracked files:
    - `index.php`
    - `system_prompt.txt`
    - `chrome-extension/email-processor.js`
  - Restore command: `git stash apply stash@{0}`
- [x] Reset working tree back to `HEAD` after exploratory refactor work.
  - Current `HEAD`: `83fd5df Ignore local markdown notes`
  - Removed exploratory untracked `src/` and `tests/` files.
  - No tracked implementation code changes are currently applied.
- [x] Explored and rejected direct inclusion of the first PSR-4 scaffold until the plan is cleaner.
- [x] Decided the webpage should be its own layer, separate from input normalization and core processing.
- [x] Decided to use Slim 4 for the webpage/router layer.
- [x] Decided not to use a full auth package initially; keep Basic Auth/cookie auth local as middleware/service.
- [x] Exercised paid fallback fetch once against RA:
  - Direct fetch returned 403.
  - Oxylabs proxy timed out.
  - Scrapefly succeeded and returned a valid large HTML artifact during exploration.
  - That artifact was removed during reset/cleanup and must be re-created later if needed.
- [x] Tried paid fallback fetch against Memories of Hyrule:
  - Direct fetch returned 403.
  - Oxylabs proxy returned 403.
  - Scrapefly returned only 240 bytes.
  - The artifact was invalid and was deleted.
- [x] Renamed `plan.local.md` to tracked `PLAN.md`.
- [x] Updated `CLAUDE.md` to make `PLAN.md` the authoritative todo and tracking list.
- [x] Confirmed no `AGENTS.md`/`agents.md` file exists in this repo.
- [x] Confirmed `CLAUDE.md` is a regular tracked file, not a symlink.
- [x] Updated active execution order per Prompt 17:
  - system prompt changes first
  - personal editable ICS generation before tests/refactor
  - tests and artifacts third, with deterministic model seed
  - larger refactor fourth
  - final verification fifth
- [x] Added requirement that the Chrome extension must use the same prompt policy moving forward.
- [x] Added requirement that generated calendar attachments should default to personal editable events, not RSVP meeting invitations.

## Implementation Plan

### Active Execution Order

This order is mandatory. The detailed backlog below must be executed according to this sequence, even if older section numbering appears to mention architecture or refactoring earlier.

1. [x] Make the system prompt changes first. *(In progress in current implementation pass.)*
   - Update the prompt to distinguish equal peer performances from related/secondary events.
   - Equal peer performances of one event/show/concert/opera should produce one calendar event per performance date/time.
   - Explicit user/email/page instructions focusing a specific date must override multi-performance extraction.
   - A page with one clearly primary/selected date plus additional related dates must keep the current primary-date behavior.
   - Keep this change narrowly scoped; do not do the larger architecture refactor in this phase.
   - Ensure backend and Chrome extension prompt policy cannot drift silently. If code cannot literally share a runtime prompt file, add tests that check both contain the same required equal-performance policy text.

2. [ ] Fix ICS invitation semantics before tests and refactor.
   - Calendar attachments generated by this app should default to personal editable events.
   - Use `METHOD:PUBLISH` or omit the calendar method where that produces better client behavior.
   - Do not emit meeting-invitation fields for normal generated events:
     - `METHOD:REQUEST`
     - `ORGANIZER`
     - `ATTENDEE`
     - `RSVP=TRUE`
     - `PARTSTAT=NEEDS-ACTION`
   - Ensure email attachment metadata does not advertise normal calendar files as RSVP requests.
   - Add focused tests for this behavior in the test phase immediately after this change.
   - Keep any true invitation/RSVP behavior as an explicit future mode, not the default.

3. [ ] Create tests with artifacts third.
   - Create PHPUnit infrastructure and tests before the larger refactor.
   - Download/store the Presidio Theatre HTML fixture under `tests/artifacts`.
   - Add other live or artificial artifacts needed for important prompt clauses.
   - Store both source artifacts and expected output artifacts under `tests/artifacts`.
   - Source artifacts may be HTML, JSON, screenshots, raw email text, or other captured inputs.
   - Output artifacts should include normalized AI JSON and generated email/ICS outputs where useful.
   - Add an explicit regeneration command/script for output artifacts so expected outputs can be regenerated, reviewed in git diff, and committed intentionally.
   - Use live pages only to create fixtures; tests must use artifacts and must not depend on live network access.
   - Add a constant testing seed in the relevant test class, for example `private const TESTING_SEED = 12345;`.
   - When tests call models, pass the constant seed so output is as consistent as the provider/model supports.
   - Use the absolute bare minimum refactor required to make these tests comprehensive:
     - fixed current date injection/emulation
     - artifact HTML input
     - deterministic model call options including seed
     - dummy email sending or recorded outbound messages
     - model cache fixture or bypass
   - Do not start the full PSR-4/Slim/input-source/fetcher-mailer refactor until these tests exist and pass against the prompt changes.

4. [ ] Refactor as specified fourth.
   - After prompt tests pass, refactor toward the planned architecture:
     - PSR-4 namespace `Jcherniak\EmailToIcs\`
     - core processing separated from input sources
     - email/webform/CLI as input sources
     - webpage as separate Slim-based web layer
     - fetcher interface and chain implementations
     - Postmark mailer interface plus dummy mailer for tests
   - Keep behavior covered by the tests from phase 3 during each refactor step.

5. [ ] Ensure tests still pass fifth.
   - Run the full PHPUnit suite after refactor.
   - Run syntax checks.
   - Run focused manual CLI verification only after automated tests pass.
   - Update the Chrome extension with the same calendar method/attachment semantics so browser-generated calendar files are personal editable events, not RSVP invitations.
   - Update this file with verification results and any residual risk.

### 1. Preserve Current Local State

- [x] Add `*.local.md` to `.gitignore`.
- [x] Create this `plan.local.md` checkpoint.
- [x] Stash interrupted tracked implementation work for later review.
- [ ] Before resuming implementation, inspect `stash@{0}` to separate useful partial work from code that should be revised.
- [ ] Prefer a clean reimplementation over blindly applying the stash. Use the stash as reference only.

### 1A. Architecture Direction

- [ ] Add PSR-4 autoloading:
  - Namespace: `Jcherniak\EmailToIcs\`
  - Path: `src/`
- [ ] Keep `index.php` as a thin front controller during migration.
- [ ] Separate the app into these layers:
  - `Core`: event processing, prompt building, result objects, ICS/email decisions.
  - `Input`: normalize email/webform/CLI/test inputs into one core request DTO.
  - `Fetch`: URL fetching behind a common interface.
  - `Mail`: outbound email behind a common interface.
  - `Web`: webpage/router/auth/form/session concerns.
  - `Support`: clock/date abstractions and shared helpers.
- [ ] Avoid adding new business logic to `index.php` except temporary delegation during migration.

### 1B. Webpage Layer

- [ ] Install Slim 4:
  - `composer require slim/slim slim/psr7`
- [ ] Do not add a full auth package initially.
- [ ] Implement local auth/session handling in the `Web` layer:
  - Basic Auth parser.
  - Cookie auth service compatible with existing `pass` cookie behavior.
  - Auth middleware.
  - Logout handling.
- [ ] Keep form rendering/session/auth separate from core processing.
- [ ] Model routes explicitly:
  - `GET /` show form.
  - `POST /` submit web form.
  - `POST /webhook/postmark` receive Postmark inbound email.
  - `GET /models` list available models.
  - `POST /confirm` send reviewed event.
- [ ] Preserve old routes/query params during migration:
  - `?get_models`
  - `?confirm=true`
  - root `POST` Postmark webhook detection if existing Postmark setup depends on it.
- [ ] Keep CORS/preflight behavior intact.

### 1C. Input Sources

- [ ] Create an `InputSourceInterface`.
- [ ] Create a single normalized core DTO, likely `ProcessingInput`.
- [ ] Implement input sources:
  - `EmailInputSource` for Postmark inbound payloads.
  - `WebFormInputSource` for authenticated browser form submissions.
  - `CliInputSource` for CLI flags.
  - `RawEmailTextInputSource` for the requested test-email-text CLI harness.
  - `ArtifactInputSource` or equivalent for tests that load fixture HTML.
- [ ] Ensure input sources only normalize input; they should not fetch URLs, call AI, send email, or generate ICS.
- [ ] Preserve email directive parsing:
  - `URL: ...`
  - `Instructions: ...`
  - standalone `MULTI`
  - plain body containing only a URL.

### 1D. Personal Editable ICS Semantics

- [ ] Change normal generated calendar files from meeting invitations to personal editable events.
- [ ] Ensure generated ICS defaults to `METHOD:PUBLISH` or omits `METHOD` if that proves more compatible.
- [ ] Remove normal-event invite fields:
  - `METHOD:REQUEST`
  - `ORGANIZER`
  - `ATTENDEE`
  - `RSVP=TRUE`
  - `PARTSTAT=NEEDS-ACTION`
- [ ] Ensure email attachment headers do not cause clients to treat generated events as RSVP invitations.
- [ ] Keep any future RSVP/invitation support as an explicit non-default mode.
- [ ] Complete this before creating the test artifacts and before the larger architecture refactor.

### 2. Add Test Infrastructure

- [ ] Add PHPUnit as a dev dependency in `composer.json`.
- [ ] Add `phpunit.xml`.
- [ ] Create `tests/`.
- [ ] Create `tests/artifacts/`.
- [ ] Download the Presidio Theatre HTML into `tests/artifacts/presidio-opera-parallele-doubt.html`.
- [ ] Add reusable test helpers for loading artifact HTML.
- [ ] Add a fake current-date provider so tests can force dates such as `2026-05-01`.
- [ ] Ensure prompt date logic uses the date provider instead of direct `date()` calls.
- [ ] Add a fixed model-cache artifact so constructing processors/tests never calls OpenRouter model listing.
- [ ] Ensure tests do not rely on live URLs after fixtures are captured.
- [ ] Add fixture/output artifact checks for personal editable ICS semantics:
  - no `METHOD:REQUEST`
  - no `ATTENDEE`
  - no `ORGANIZER`
  - no RSVP/needs-action fields
  - attachment metadata uses `PUBLISH` or a plain text/calendar attachment

### 3. Abstract Postmark

- [ ] Create `Mail\MailerInterface`.
- [ ] Create `Mail\PostmarkMailer`.
- [ ] Create `Mail\DummyMailer` that records sent messages for tests.
- [ ] Create email DTOs, probably:
  - `EmailMessage`
  - `EmailAttachment`
- [ ] Move direct Postmark API calls out of `EmailProcessor::sendEmail()` into the concrete `PostmarkMailer`.
- [ ] Inject the mailer into the core processor.
- [ ] Keep existing production behavior unchanged by defaulting to the real Postmark mailer when no dependency is supplied.

### 4. Make AI and Fetching Testable

- [ ] Create `Fetch\UrlFetcherInterface`.
- [ ] Create production fetchers:
  - `DirectUrlFetcher`
  - `OxylabsProxyUrlFetcher`
  - `ScrapeflyUrlFetcher`
  - `ChainUrlFetcher`
- [ ] Create test fetchers:
  - `ArtifactUrlFetcher` maps URL to fixture file.
  - `DummyFetcher` can return static content or failure responses.
- [ ] Preserve fallback order:
  - direct
  - Oxylabs proxy
  - Scrapefly
- [ ] Add tests for fallback behavior without paid network calls by composing dummy fetchers.
- [ ] Add at least one manually captured paid-fallback artifact later, after validating content before keeping it.
- [ ] Add dependency injection or protected overridable methods for the AI call.
- [ ] Add a fake AI responder for tests.
- [ ] Add dependency injection or a fixture path for fetched URL content.
- [ ] Avoid network calls in PHPUnit tests.
- [ ] Avoid OpenRouter calls in PHPUnit tests.
- [ ] Avoid Google Maps lookup in PHPUnit tests or provide a fake lookup result.

### 4A. Fixture Artifacts

- [ ] Recreate `tests/artifacts/` after the reset.
- [ ] Download and keep live HTML artifacts if valid:
  - Presidio Theatre `Opera Parallèle: Doubt` equal-performance page.
  - Chamber Music SF 2026 season page from history.
  - NAC single-date event page from exploration if still useful.
  - Chiquis tour/multiple-cities page from exploration if still useful.
- [ ] For paid fallback fetch:
  - Download to `.tmp` first.
  - Validate file size and content (`html`, `event`, `ticket`, `performance`, etc.).
  - Rename into artifact path only after validation.
  - Delete invalid paid fallback output immediately.
- [ ] Use artificial fixtures where live pages are unstable or blocked:
  - equal performances of the same event
  - one primary date plus related/extra dates
  - explicit user instruction focusing a specific date
  - no dates anywhere
  - source URL and tracking-parameter cleanup
  - timezone inference by location
  - all-day event with no times

### 5. Fix Equal-Performance Extraction

- [ ] Update prompt/schema behavior so equal performances can return an `eventData` array.
- [ ] Ensure explicit user instructions such as “focus on May 30” force a single event.
- [ ] Ensure a page with one primary selected date and extra related dates still returns one event.
- [ ] Consider deterministic pre-analysis of HTML ticket lists instead of relying only on prompt wording.
- [ ] Re-run the CLI test until the JSON has exactly three events for the Presidio artifact.

### 6. Add Required Tests

- [ ] Test JSON structure for the Presidio scenario:
  - `success === true`
  - `eventData` is an array
  - `eventData` has exactly 3 entries
  - each event has required fields
  - dates/times are May 29 7:30 PM, May 30 7:30 PM, and May 31 3:00 PM
  - timezone is `America/Los_Angeles`
- [ ] Test email generation for the Presidio scenario:
  - dummy mailer records exactly 3 outbound emails
  - each email has one ICS attachment
  - each ICS attachment contains exactly one `VEVENT`
  - subjects include enough date/time information to distinguish the three messages
- [ ] Test source URL preservation in JSON and descriptions.
- [ ] Test fixed current-date behavior for year inference.
- [ ] Test explicit instruction override:
  - input says focus on one date
  - JSON contains one event
  - dummy mailer records one email
- [ ] Test single-primary-date behavior with fixture or minimal HTML:
  - one main date plus related/extra dates
  - JSON contains one event
  - dummy mailer records one email

### 7. Verify

- [ ] Run `composer install` or `composer update` as needed after adding PHPUnit.
- [ ] Run `vendor/bin/phpunit`.
- [ ] Run `php -l index.php`.
- [ ] Run `php -l IcalGenerator.php`.
- [ ] Run `node --check chrome-extension/email-processor.js` if extension code remains changed.
- [ ] Run the CLI test-email command manually once after tests pass.
- [ ] Update and verify the Chrome extension uses the same personal editable event semantics:
  - no `METHOD:REQUEST`
  - no `ATTENDEE`
  - no `ORGANIZER`
  - no RSVP/needs-action fields
  - use `PUBLISH` or plain `text/calendar` attachment behavior where applicable

## Notes For Resume

- The repo has been reset to clean `HEAD`; do not expect `src/` or `tests/` to exist.
- Start by inspecting the stash: `git stash show --stat stash@{0}` and `git stash show -p stash@{0}`.
- The stash contains partial prompt, CLI, and multi-email splitting work. It is not complete and should be treated as draft implementation context.
- The last live AI result still returned a single event despite recognizing all three performances in the description.
- The likely immediate bug is that automatic multi-event mode did not trigger for the direct URL path because the date and time are separated in adjacent HTML spans, not in one contiguous string like `May 29, 2026 at 7:30 PM`.
- A robust fix should not depend entirely on contiguous regex matching. It should either parse the ticket list markup or detect repeated date spans with adjacent time spans.
- The user explicitly wants Postmark abstracted first so tests can verify emails through dependency injection.
- The user also wants fetching abstracted behind common interfaces, including dummy/artifact fetchers for tests.
- The user wants input separated from core processing:
  - email is an input source
  - web form is an input source
  - CLI is an input source
  - the webpage itself is a separate web layer for routing, auth/session, and form rendering
- Router/auth decision:
  - Use Slim 4 (`slim/slim`, `slim/psr7`) for the webpage router.
  - Keep auth local as middleware/service for now rather than using a full auth package.
