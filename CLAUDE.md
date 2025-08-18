# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Email-to-ICS v2.0 is a modern monorepo application that converts emails and web content into ICS (iCalendar) files using AI models. It features a self-hosting Chrome extension and Node.js server implementation with shared core libraries.

## Architecture

This Turborepo monorepo has three main packages:

### 1. **Shared Core** (`packages/shared-core/`)
   - Platform-agnostic TypeScript library
   - ICS generation with browser and Node.js adapters
   - AI parsing logic with JSON schema validation
   - Adapters for storage, HTTP, and platform-specific functionality
   - Built with TypeScript targeting ES2022

### 2. **Chrome Extension** (`packages/extension/`)
   - Self-hosting extension with iframe-based in-page UI
   - Direct OpenRouter API integration (no server dependency)
   - Privileged screenshot capture with zoom functionality
   - Chrome WebExtensions API integration
   - Built with esbuild, uses shared-core library

### 3. **Node.js Server** (`packages/server/`)
   - Fastify-based web server with SQLite database
   - Web interface and API endpoints
   - Uses shared-core library for ICS generation
   - Postmark integration for email delivery
   - HTTP Basic Auth protection

## Commands

### Monorepo Development
```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Start development mode (all packages)
npm run dev

# Run tests
npm run test

# Clean all build artifacts
npm run clean
```

### Extension Development
```bash
cd packages/extension

# Build extension for Chrome
npm run build

# Watch mode for development
npm run watch

# Load unpacked extension from packages/extension/dist/
```

### Server Development
```bash
cd packages/server

# Start development server
npm run dev

# Build for production
npm run build

# Run built server
npm run start
```

## Key Implementation Details

### Extension Architecture (Self-Hosting)
- **No server dependency** - Extension communicates directly with OpenRouter API
- **Iframe-based UI** - In-page dialog injection for multi-instance support
- **Privileged screenshot capture** - Background script handles chrome.tabs.captureVisibleTab with zoom
- **Chrome storage** - Settings persist via chrome.storage.sync
- **Content script** - Manages iframe lifecycle and keyboard shortcuts (Ctrl+Shift+E)

### Server Architecture (Optional)
- **Fastify HTTP server** - Modern Node.js web framework
- **SQLite database** - Better-sqlite3 for fast local storage
- **Shared-core library** - Same ICS generation logic as extension
- **HTTP Basic Auth** - Simple authentication for web interface

### AI Integration (Both Extension & Server)
- **OpenRouter API** - Direct integration with multiple AI models
- **JSON Schema validation** - Structured responses with events array
- **Multi-event support** - Single or multiple calendar events per extraction
- **Fallback models** - Graceful degradation when primary model unavailable

### ICS Generation (Shared Library)
- **Platform adapters** - Browser and Node.js implementations
- **Pure JavaScript** - RFC 5545 compliant without native dependencies
- **Multi-event merging** - Combines multiple VEVENT blocks in single ICS file
- **Timezone support** - Handles various timezone formats

## Environment Configuration

### Extension Settings (Chrome Storage)
Configure via extension settings dialog:
- `openRouterKey`: OpenRouter API key
- `postmarkApiKey`: Postmark API key (for email sending)
- `fromEmail`: Sender email address
- `toConfirmedEmail`: Recipient for confirmed events
- `toTentativeEmail`: Recipient for tentative events
- `defaultModel`: Default AI model (openai/gpt-5)

### Server Environment (`.env` file)
```env
OPENROUTER_KEY=your_openrouter_key
POSTMARK_API_KEY=your_postmark_key
HTTP_AUTH_USERNAME=admin
HTTP_AUTH_PASSWORD=your_password
DATABASE_PATH=./data/app.db
PORT=3000
```

## Important File Locations

### Shared Core Library
- `packages/shared-core/src/adapters/` - Platform adapters (browser/Node.js)
- `packages/shared-core/src/lib/` - ICS generation logic
- `packages/shared-core/src/types/` - TypeScript definitions

### Chrome Extension
- `packages/extension/src/popup.ts` - Main extension UI (869 lines)
- `packages/extension/src/content.ts` - Iframe injection script
- `packages/extension/src/background.js` - Screenshot capture and messaging
- `packages/extension/manifest.json` - Extension configuration
- `packages/extension/dist/` - Built extension files

### Node.js Server
- `packages/server/src/server.ts` - Main server application
- `packages/server/src/routes/` - API endpoints
- `packages/server/public/` - Static web files

## Critical Implementation Notes

### Chrome Extension UI Flow
The extension uses an iframe-based architecture with three main views:

1. **Form Section** (`formSection`) - Initial input form
   - URL input (auto-populated from current page)
   - Instructions textarea (populated from selected text)
   - AI model selection dropdown
   - Tentative/confirmed toggle (tentative is default)
   - Multi-event checkbox for extracting multiple events
   - Review workflow options (direct send vs review first)

2. **Processing View** (`processingView`) - Loading state with real-time status
   - Shows request parameters in collapsible accordion
   - Live status updates: "Getting page content...", "Capturing screenshot...", "Analyzing content with AI..."
   - Response data accordion with AI output
   - Cancel button (currently hidden by default)

3. **Review Section** (`reviewSection`) - Event confirmation before sending
   - Displays extracted event details for user approval
   - Send/Reject buttons for final confirmation
   - Recipient email preview

### Iframe Communication Pattern
```typescript
// Content script creates iframe
const iframe = document.createElement('iframe');
iframe.src = chrome.runtime.getURL('popup.html');

// Initialize iframe with page data
iframe.onload = () => {
  iframe.contentWindow?.postMessage({
    type: 'INIT_FROM_CONTENT',
    data: { url, title, selectedText }
  }, '*');
};

// Handle close requests
window.addEventListener('message', (event) => {
  if (event.data.type === 'CLOSE_IFRAME') {
    removeIframe();
  }
});
```

### Screenshot Capture Architecture
The extension uses a privileged background script approach:

1. **Content script** requests screenshot via `chrome.runtime.sendMessage`
2. **Background script** handles privileged operations:
   - Gets page dimensions via `chrome.scripting.executeScript`
   - Calculates zoom factor to fit entire page in viewport
   - Applies temporary zoom via `document.body.style.zoom`
   - Captures visible area with `chrome.tabs.captureVisibleTab`
   - Restores original zoom and scroll position
   - Returns base64 screenshot data

### JSON Schema for AI Responses
The system enforces structured responses using JSON schema:

```typescript
const eventSchema = {
  type: "object",
  properties: {
    events: {
      type: "array",
      minItems: 1,
      maxItems: multiday ? 50 : 1,  // Single event unless multiday enabled
      items: {
        type: "object",
        properties: {
          summary: { type: "string" },
          start_date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          start_time: { type: ["string", "null"], pattern: "^\\d{2}:\\d{2}$" },
          // ... other event properties
        },
        required: ["summary", "start_date", "timezone"]
      }
    }
  }
};
```

### Storage Adapter Pattern
The shared-core library uses adapters to handle different storage mechanisms:

```typescript
// Browser adapter uses Chrome storage
class ChromeStorageAdapter implements StorageAdapter {
  async get<T>(key: string): Promise<T | null> {
    const result = await chrome.storage.local.get([key]);
    const item = result[key];
    
    // Handle metadata wrapper from set method
    if (typeof item === 'object' && item.value !== undefined) {
      if (item.expires && Date.now() > item.expires) {
        await this.delete(key);
        return null;
      }
      return item.value;
    }
    return item;
  }
}
```

## Common Issues and Solutions

### Extension Loading Issues
1. **Missing files error** - Ensure all files are copied during build:
   ```bash
   npm run copy-assets  # Copies HTML, CSS, background.js, manifest.json, icons
   ```

2. **Content script injection fails** - Check for CSP restrictions on target sites
3. **Screenshot capture fails** - Verify `activeTab` and `scripting` permissions in manifest

### Build and Development Issues
1. **ES module import errors** - All imports in shared-core must use `.js` extensions:
   ```typescript
   import { something } from './module.js';  // ✓ Correct
   import { something } from './module';     // ✗ Will fail
   ```

2. **TypeScript compilation issues** - Run `npm run build:shared-core` before building extension
3. **Extension not updating** - Reload extension in `chrome://extensions/` after changes

### API and Authentication Issues
1. **OpenRouter API errors** - Check API key in extension settings
2. **Settings not persisting** - Chrome storage adapter properly handles metadata wrapping
3. **Screenshot permission denied** - Extension needs `activeTab` permission

### Multi-Event vs Single Event Behavior
- **Single event mode** (default): JSON schema enforces exactly 1 event in array
- **Multi-event mode**: Allows up to 50 events, generates combined ICS file with multiple VEVENT blocks
- **Tentative default**: Checkbox starts checked (matches original behavior)

## Development Workflow

### Making Changes to Extension
1. Edit TypeScript files in `packages/extension/src/`
2. Run `npm run build` in extension directory
3. Reload extension in Chrome (click reload button in `chrome://extensions/`)
4. Test on target websites

### Making Changes to Shared Core
1. Edit files in `packages/shared-core/src/`
2. Run `npm run build` in shared-core directory  
3. Rebuild dependent packages (extension and/or server)
4. Test functionality

### Debugging Extension Issues
1. **Console logs**: Check Chrome DevTools for both page context and extension context
2. **Background script**: Inspect background page in `chrome://extensions/`
3. **Network requests**: Monitor OpenRouter API calls in Network tab
4. **Storage inspection**: Use Application tab to view `chrome.storage.local` contents

### Testing Different Scenarios
- **URL mode**: Provide URL in input field
- **Current page mode**: Leave URL empty, extension captures current page
- **Selected text**: Select text on page before opening extension
- **Multi-event extraction**: Enable multiday checkbox for conference schedules, etc.
- **Review workflow**: Test both direct send and review-first modes