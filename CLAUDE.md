# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Email-to-ICS is a web application and Chrome extension that converts emails and web content into ICS (iCalendar) files using AI models. It can extract event information from HTML content, emails, or URLs and send calendar invites via email.

## Architecture

The project has three main components:

1. **PHP Backend Server** (`index.php`, `IcalGenerator.php`)
   - EmailProcessor class handles core logic
   - Integrates with OpenRouter API for AI models
   - Uses Postmark for email delivery
   - Implements two-step confirmation flow for event review
   - Supports CLI mode for direct email processing

2. **Chrome Extension** (`chrome-extension/`)
   - Browser integration for quick ICS generation from any webpage
   - Captures full page screenshots with zoom support
   - Context menu integration for selected text
   - Built with esbuild, uses ical.js for parsing

3. **Web Interface** (`form.html`)
   - Simple form for manual ICS generation
   - Options for tentative/confirmed events

## Commands

### Backend Development
```bash
# Install PHP dependencies (requires PHP 8.4+)
composer install

# Run locally
php -S localhost:8000

# Process email from CLI
php index.php < email.txt
```

### Chrome Extension Development
```bash
cd chrome-extension

# Install dependencies
npm install

# Build popup bundle
npm run build

# Development mode with watch
npm run watch
```

## Key Implementation Details

### Authentication Flow
- Web interface uses HTTP Basic Auth (credentials in .env)
- Chrome extension checks auth status via models endpoint
- Server returns 401 for unauthorized requests

### AI Model Integration
- Models fetched from OpenRouter API
- Cached in `/tmp/.models_cache.json` for 15 minutes
- JSON schema validation for AI responses ensures structured output
- Multi-model support with fallback handling

### Event Processing Flow
1. Content extraction (HTML/screenshots)
2. AI analysis with structured prompt
3. ICS generation with eluceo/ical
4. Optional review step before sending
5. Email delivery via Postmark

### Chrome Extension State Management
- Uses chrome.storage.sync for preferences
- Implements screenshot capture with full-page zoom
- Processing view shows request/response details
- Review section for confirming events before sending

## Environment Configuration

Copy `.env.template` to `.env` and configure:
- `OPENROUTER_KEY`: Required for AI models
- `POSTMARK_API_KEY`: Required for email delivery
- `HTTP_AUTH_USERNAME/PASSWORD`: Web interface auth
- `ALLOWED_MODELS`: Comma-separated list of model IDs
- `DEFAULT_MODEL`: Primary model to use
- Email addresses for different event types

## Important File Locations

- `index.php`: Main server logic, EmailProcessor class
- `IcalGenerator.php`: ICS file generation logic
- `chrome-extension/popup.js`: Extension UI logic (1354 lines)
- `chrome-extension/manifest.json`: Extension configuration
- `form.html`: Web interface

## Critical Implementation Notes

### Chrome Extension Processing View
The extension has three main views:
1. **Form Section**: Initial input form
2. **Processing View**: Shows loading state with request/response details
3. **Review Section**: Displays parsed event for confirmation

When modifying the loading behavior, note that `generateICS()` function controls view transitions:
- Line 889: `formSection.style.display = 'none'` hides the form during processing
- Line 891: `processingView.style.display = 'block'` shows the loading view
- To keep form visible during loading, modify these display toggles

### Server Response Handling
The server returns different response formats:
- **Direct send**: JSON with `{message: "...", icsContent: "..."}`
- **Review needed**: JSON with `{needsReview: true, confirmationToken: "...", icsContent: "..."}`
- **Confirmation endpoint**: `POST /?confirm=true` with confirmationToken

### Common Issues and Solutions

1. **Models not loading**: Check CORS headers in index.php, ensure auth cookies are sent
2. **Screenshots failing**: Chrome extension requires activeTab permission, zoom logic in `captureVisibleTabScreenshot()`
3. **Review flow not triggering**: Verify server returns `needsReview: true` in JSON response
4. **Form data persistence**: Extension uses chrome.storage.sync for preferences, not form data

### Testing Considerations

- Extension must be loaded unpacked for development
- Server requires HTTPS for production (CORS/cookie policies)
- CLI mode bypasses auth and web-specific features
- Model caching can be cleared by deleting `/tmp/.models_cache.json`

### Workflow Guidance
- For each logical todo part (so for example, all multiday tasks as one), create a git commit