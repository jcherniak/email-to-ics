# Email-to-ICS v2.0

A modern email-to-calendar conversion system with AI-powered event extraction. This project provides both a self-hosting Chrome extension and a Node.js server implementation, sharing code through a unified library architecture.

## Architecture

This is a Turborepo monorepo with three main components:

### 📦 Packages

- **`packages/shared-core`** - Platform-agnostic shared library for ICS generation and AI parsing
- **`packages/extension`** - Self-hosting Chrome extension with iframe-based UI
- **`packages/server`** - Node.js server with SQLite database and web interface

### 🌟 Key Features

- **AI-Powered Event Extraction** - Uses OpenRouter API with structured JSON schema
- **Multi-Event Support** - Extract single or multiple events from content
- **Screenshot Capture** - Full-page screenshots with zoom functionality
- **Self-Hosting Extension** - No server dependency for Chrome extension
- **Shared Code Library** - Maximum code reuse between server and extension
- **Review Workflow** - Optional event review before sending
- **Direct API Integration** - OpenRouter and Postmark API integration

## Quick Start

### Prerequisites

- Node.js 23.11.0+ (for Node modules compatibility)
- Chrome browser (for extension)
- OpenRouter API key
- Postmark API key (for email sending)

### Installation

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Start development server
npm run dev
```

### Chrome Extension Setup

1. Build the extension:
   ```bash
   cd packages/extension
   npm run build
   ```

2. Load unpacked extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `packages/extension/dist` folder

3. Configure extension settings:
   - OpenRouter API key
   - Postmark API key
   - Email addresses for confirmed/tentative events

### Server Setup

1. Create environment file:
   ```bash
   cp packages/server/.env.template packages/server/.env
   ```

2. Configure environment variables in `.env`:
   ```env
   OPENROUTER_KEY=your_openrouter_key
   POSTMARK_API_KEY=your_postmark_key
   HTTP_AUTH_USERNAME=admin
   HTTP_AUTH_PASSWORD=your_password
   ```

3. Start the server:
   ```bash
   cd packages/server
   npm run dev
   ```

4. Access web interface at `http://localhost:3000`

## Usage

### Chrome Extension

1. **Click extension icon** on any webpage to open in-page dialog
2. **Configure extraction**:
   - Add specific instructions (optional)
   - Select AI model
   - Choose tentative/confirmed status
   - Enable multi-day for multiple events
3. **Generate ICS**: Extension captures screenshot and processes content
4. **Review & Send**: Optionally review extracted events before sending

### Server Interface

1. Navigate to server URL
2. Authenticate with configured credentials
3. Paste email content or provide URL
4. Configure extraction settings
5. Generate and send calendar events

## Development

### Project Structure

```
email-to-ics/
├── packages/
│   ├── shared-core/          # Platform-agnostic shared library
│   │   ├── src/
│   │   │   ├── adapters/     # Platform adapters (Node.js/Browser)
│   │   │   ├── lib/          # Core ICS generation logic
│   │   │   └── types/        # TypeScript definitions
│   │   └── dist/             # Compiled JavaScript
│   │
│   ├── extension/            # Self-hosting Chrome extension
│   │   ├── src/
│   │   │   ├── popup.ts      # Main extension UI
│   │   │   ├── content.ts    # Iframe injection script
│   │   │   ├── background.js # Screenshot & messaging
│   │   │   └── popup.html    # Extension HTML
│   │   └── dist/             # Built extension files
│   │
│   └── server/               # Node.js Fastify server
│       ├── src/
│       │   ├── routes/       # API endpoints
│       │   ├── services/     # Business logic
│       │   └── server.ts     # Main server file
│       └── public/           # Static web files
│
├── php/                      # Original PHP implementation (reference)
└── turbo.json               # Turborepo configuration
```

### Development Commands

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Start development mode
npm run dev

# Lint all packages
npm run lint

# Test all packages
npm run test

# Clean build artifacts
npm run clean
```

### Building Individual Packages

```bash
# Build shared core
cd packages/shared-core
npm run build

# Build extension
cd packages/extension
npm run build

# Build server
cd packages/server
npm run build
```

## Configuration

### Environment Variables

#### Server Configuration
- `OPENROUTER_KEY` - OpenRouter API key for AI models
- `POSTMARK_API_KEY` - Postmark API key for sending emails
- `HTTP_AUTH_USERNAME` - Basic auth username for web interface
- `HTTP_AUTH_PASSWORD` - Basic auth password for web interface
- `DATABASE_PATH` - SQLite database file path (default: ./data/app.db)

#### Extension Configuration
Configured via Chrome extension settings:
- OpenRouter API key
- Postmark API key
- From email address
- Confirmed events email
- Tentative events email
- Default AI model

### AI Models

Supported models via OpenRouter:
- GPT-5 (default)
- Gemini 2.5 Pro
- Claude Sonnet 4
- OpenAI o3
- Claude Opus 4.1
- OpenAI o4 Mini High

### JSON Schema

The system uses structured JSON schema for AI responses:

```json
{
  "events": [
    {
      "summary": "Event title",
      "location": "Event location or empty string",
      "start_date": "YYYY-MM-DD",
      "start_time": "HH:MM or null for all-day",
      "end_date": "YYYY-MM-DD",
      "end_time": "HH:MM or null for all-day",
      "description": "Event description",
      "timezone": "America/New_York",
      "url": "Event URL or source URL"
    }
  ]
}
```

## Migration from PHP

The original PHP implementation is preserved in the `php/` directory for reference. The new Node.js architecture provides:

- **Better maintainability** with TypeScript and modern tooling
- **Code sharing** between server and extension
- **Improved testing** with Vitest framework
- **Modern deployment** with Docker support
- **Enhanced security** with structured validation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test`
5. Run linting: `npm run lint`
6. Submit a pull request

## License

This project is private and proprietary.

## Support

For issues or questions, please refer to the CLAUDE.md file for development notes and troubleshooting guidance.