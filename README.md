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
https://example.test/event

---
Focus on the May 30 performance only.
Ignore related events listed elsewhere on the page.
```

The separator must be a line containing at least three dashes, with one or more blank lines above it. Any text below the separator is treated as override instructions for the model. This override takes precedence over an earlier `Instructions:` line if both formats are present.

URL-only messages are supported. The parser handles UTF-8 BOM-prefixed mail bodies, simple HTML bodies, and URL-only bodies with a trailing bare `?`.
