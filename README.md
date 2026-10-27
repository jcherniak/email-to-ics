# Email To ICS

Email-to-ICS converts emails, URLs, and web content into calendar events and ICS files.

## Setup

```bash
composer install          # PHP dependencies
npm install               # Readability content cleanup (node + @mozilla/readability + jsdom)
cp .env.template .env     # then fill in keys
```

Fetched pages are cleaned with Mozilla Readability through `scripts/readability.mjs`. If `node` or the
dependencies are missing, or extraction yields too little text, the lightened full page is sent instead
(see `READABILITY_*` in `.env.template`).

## Reply to Edit

Every calendar email (and every "choose events" email) carries a unique `Reply-To: edit-<key>@<INBOUND_REPLY_DOMAIN>`.
Reply above the quote with the changes you want ("move it to 8pm", "only keep the Saturday show", "add the box office phone")
and the events are regenerated with those instructions, using the previously sent ICS as context, then re-sent (or offered
again as candidates when several come back). Keep the quoted original in your reply: it carries a `[source-url: ...]` line
that lets the server re-fetch the page if its stored state has expired. Optional lines: `--model <id>` to pick the model,
`<multiple>` to receive every candidate as its own email.

Postmark setup: point the subdomain's MX at `inbound.postmarkapp.com` and set the inbound webhook to this app's URL.

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
