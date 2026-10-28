# Email To ICS

Email-to-ICS converts emails, URLs, and web content into calendar events and ICS files.

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

## Production Deployment (Docker)

Production runs as a single `php:8.4-apache` container (`Dockerfile`, `docker-compose.yml`) with Node 22, Debian Chromium for puphpeteer, and `poppler-utils` for PDF text. It publishes no host ports: it joins the external Docker network `edge`, where the TLS reverse proxy forwards to `http://email-to-ics:80` and sends `X-Forwarded-Proto`/`X-Forwarded-For`. The app is served at the web root.

First deploy, from the repo checkout on the host:

```bash
cp .env.template .env   # then fill in real values
docker network create edge 2>/dev/null || true
docker compose up -d --build
```

Update:

```bash
git pull --ff-only && docker compose up -d --build
```

`.env` is bind-mounted read-only into the app directory. Runtime data lives in the gitignored `data/` directory of the checkout: `data/processed/`, `data/uploads/`, and `data/confirm_cache/` (mounted at `/tmp/confirm_cache`, where pending review confirmations are kept). The container makes them writable by `www-data` on start. Apache and PHP errors go to `docker compose logs`.

Run the PHPUnit suite in the same runtime:

```bash
docker build --target test -t email-to-ics:test . && docker run --rm email-to-ics:test
```

Clients outside the server keep their own URL: set the Chrome extension's base URL in its settings, and edit `targetUrl` in `bookmarklet.js`, when the host changes.
