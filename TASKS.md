# Email-to-ICS Node.js Migration Tasks

## Multi-LLM Analysis Complete ✅
**Consensus Recommendations (8-8.2/10 confidence across all models):**
- Monorepo with Turborepo for shared code between Node.js server and Chrome extension
- Platform adapter pattern for Node.js vs browser API differences  
- Fastify + SQLite + better-sqlite3 for performance
- iOS Orion early validation as highest risk
- Security-first curlBrowser integration via Docker

## Implementation Plan - 8 Week Timeline

### Phase 1: Foundation & Risk Validation (Weeks 1-2) ⏳
- [x] Multi-LLM analysis completed
- [x] Create TASKS.md for progress tracking
- [ ] **CRITICAL: iOS Orion PoC** - Test WebExtensions API limitations
- [ ] Set up Turborepo monorepo structure
- [ ] Create shared core library with platform adapters
- [ ] Move PHP files to /php folder

### Phase 2: Core Library Implementation (Weeks 3-4)
- [ ] Port ICS generation using ical-generator library
- [ ] Implement AI parsing service with OpenRouter integration
- [ ] Create platform adapters (Node.js vs Browser)
- [ ] Add comprehensive unit tests with snapshot testing
- [ ] Validate RFC 5545 compliance parity with PHP

### Phase 3: Node.js Server (Weeks 5-6)
- [ ] Implement Fastify server with typed routes
- [ ] SQLite caching with better-sqlite3
- [ ] Replicate all PHP endpoints (/process-email, /generate-ics, /confirm)
- [ ] Environment configuration (.env support)
- [ ] Postmark integration for email delivery

### Phase 4: Chrome Extension Migration (Weeks 6-7)
- [ ] Update extension to use shared core library
- [ ] Vite build system for MV3 compatibility
- [ ] iOS Orion compatibility layer with fallbacks
- [ ] Screenshot capture with graceful degradation

### Phase 5: Docker & Security (Week 7)
- [ ] curlBrowser Docker container with network isolation
- [ ] Docker Compose orchestration
- [ ] Security hardening (SSRF protection, secrets management)
- [ ] Resource limits and monitoring

### Phase 6: Testing & Documentation (Week 8)
- [ ] End-to-end test suite with Playwright
- [ ] Integration tests comparing PHP vs Node.js outputs
- [ ] Update README.md with complete setup instructions
- [ ] Update CLAUDE.md with new build instructions
- [ ] Performance benchmarking and optimization

## Architecture Decisions (LLM Consensus)

### Repository Structure
```
email-to-ics/
├── packages/
│   ├── shared-core/          # Platform-agnostic TypeScript library
│   ├── server/               # Fastify Node.js backend  
│   ├── chrome-extension/     # Chrome MV3 extension
│   └── orion-extension/      # iOS Safari/Orion extension
├── php/                      # Legacy PHP code (reference)
├── docker/                   # Docker configs and compose
└── tests/                    # Integration and E2E tests
```

### Technology Stack
- **Monorepo**: Turborepo for build orchestration
- **Server**: Fastify + better-sqlite3 + TypeScript
- **ICS**: ical-generator library for RFC 5545 compliance
- **Build**: Vite for extensions, esbuild for server
- **Testing**: Vitest + Playwright for E2E
- **Deployment**: Docker Compose with curlBrowser isolation

### Critical Success Factors
1. **iOS Orion Validation** - Must test WebExtensions APIs early
2. **ICS Parity** - Snapshot testing vs PHP outputs
3. **Security** - Isolated curlBrowser with SSRF protection  
4. **Performance** - SQLite caching with <100ms response times
5. **Backward Compatibility** - Parallel deployment during transition

## Current Status
✅ **Analysis Phase Complete** - All 4 LLMs provided convergent high-confidence recommendations
⏳ **Starting Phase 1** - Beginning with iOS Orion PoC and monorepo setup