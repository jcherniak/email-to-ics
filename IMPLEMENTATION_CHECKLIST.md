# Implementation Checklist

## Phase 1: Foundation (Quick Wins)

### Enhanced AI Prompts & Event Naming
- [ ] Update `generateIcalEvent()` in index.php with enhanced prompts
- [ ] Add artistic event detection (Venue - Artist format)
- [ ] Include program/repertoire extraction
- [ ] Add multi-event detection logic
- [ ] Test with sample concert/opera pages

### Model Picker for form.html
- [ ] Add model dropdown HTML to form.html
- [ ] Implement JavaScript to fetch models on load
- [ ] Update form submission to include selected model
- [ ] Add default model fallback from .env
- [ ] Style to match existing form design

## Phase 2: Multi-Day Event Support

### Backend Changes
- [ ] Update JSON schema in `getEventJsonSchema()`
- [ ] Add `$allowMultiDay` parameter throughout
- [ ] Implement event array handling in response
- [ ] Add multi-day parameter to form processing
- [ ] Update confirmation/review flow for multiple events

### ICS Generator Updates
- [ ] Create `convertMultipleEventsToIcs()` method
- [ ] Link related events in descriptions
- [ ] Handle timezone consistency across events
- [ ] Test with various multi-day scenarios

### Frontend Updates
- [ ] Add multi-day checkbox to form.html
- [ ] Add multi-day toggle to Chrome extension
- [ ] Update review UI to show multiple events
- [ ] Implement event navigation in review
- [ ] Add "Save All" vs "Save Selected" options

## Phase 3: Chrome Extension Improvements

### Tab State Management
- [ ] Create TabStateManager class
- [ ] Implement state save on tab switch
- [ ] Implement state restore on popup open
- [ ] Add periodic cleanup of old states
- [ ] Handle edge cases (tab close, refresh)

### State Persistence
- [ ] Save form data to chrome.storage.local
- [ ] Include processing state
- [ ] Preserve screenshot data
- [ ] Handle storage quota limits
- [ ] Add state versioning

### Review Mode Fixes
- [ ] Fix showReviewSection display logic
- [ ] Ensure proper data validation
- [ ] Fix processing view to form transition
- [ ] Add loading states
- [ ] Improve error handling

## Phase 4: iOS Shortcut Support

### Backend Endpoint
- [ ] Create ios-shortcut.php
- [ ] Implement simplified JSON response
- [ ] Add iOS user agent detection
- [ ] Support both GET and POST
- [ ] Add rate limiting

### Shortcut Creation
- [ ] Create Shortcut template
- [ ] Write setup documentation
- [ ] Add to form.html homepage
- [ ] Test with Safari share sheet
- [ ] Handle missing JavaScript scenarios

## Phase 5: Attachment Handling

### Infrastructure
- [ ] Create uploads directory
- [ ] Set proper permissions
- [ ] Add .htaccess protection
- [ ] Implement cleanup cron

### File Processing
- [ ] Add file upload to form.html
- [ ] Implement MIME type validation
- [ ] Create filename sanitization
- [ ] Generate secure download tokens
- [ ] Add to event descriptions

### Email Attachments
- [ ] Extract from Postmark webhooks
- [ ] Support common formats (PDF, DOCX, etc)
- [ ] Generate event-based filenames
- [ ] Store with proper organization

## Phase 6: Bug Fixes & Polish

### Critical Fixes
- [ ] Move CORS headers to proper location
- [ ] Fix authentication check order
- [ ] Handle missing model gracefully
- [ ] Fix token expiration issues
- [ ] Resolve race conditions

### UI/UX Improvements
- [ ] Keep form visible during processing
- [ ] Add progress indicators
- [ ] Improve error messages
- [ ] Add success animations
- [ ] Mobile responsive fixes

### Performance
- [ ] Optimize AI prompt tokens
- [ ] Cache processed events
- [ ] Lazy load Chrome extension
- [ ] Compress screenshots
- [ ] Minimize API calls

## Testing Checklist

### Unit Tests
- [ ] Multi-event parsing
- [ ] Attachment processing
- [ ] Token generation
- [ ] Date/timezone handling
- [ ] Input sanitization

### Integration Tests
- [ ] Full multi-day flow
- [ ] Chrome extension scenarios
- [ ] iOS Shortcut execution
- [ ] Email processing
- [ ] Error scenarios

### Security Tests
- [ ] File upload exploits
- [ ] XSS in descriptions
- [ ] Token prediction
- [ ] Rate limit bypass
- [ ] Authentication bypass

## Git Commit Plan

Each checkbox group above should be a separate commit:

1. `feat: enhance AI prompts for better event extraction`
2. `feat: add model picker to web form`
3. `feat: implement multi-day event support`
4. `feat: add tab-specific state management to extension`
5. `fix: resolve review mode display issues`
6. `feat: add iOS Shortcut support`
7. `feat: implement attachment handling`
8. `fix: resolve CORS and authentication issues`
9. `fix: improve UI/UX and error handling`
10. `perf: optimize performance and caching`

## Post-Implementation

- [ ] Update CLAUDE.md with new features
- [ ] Create user documentation
- [ ] Set up monitoring
- [ ] Plan gradual rollout
- [ ] Gather user feedback