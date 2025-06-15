# Email-to-ICS Architecture & Implementation Plan

## Overview

This document outlines the comprehensive architecture and implementation plan for enhancing the Email-to-ICS converter with new features including multi-day event support, improved Chrome extension functionality, iOS Shortcuts integration, and enhanced AI processing.

## Current Architecture

### System Components

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Web Form      │     │ Chrome Extension │     │  iOS Shortcut   │
│  (form.html)    │     │   (popup.js)     │     │   (planned)     │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                          │
         └───────────────────────┴──────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    PHP Backend          │
                    │    (index.php)          │
                    │  - EmailProcessor       │
                    │  - Authentication       │
                    │  - CORS Headers         │
                    └────────────┬────────────┘
                                 │
                ┌────────────────┴────────────────┐
                │                                 │
         ┌──────▼──────┐                ┌────────▼────────┐
         │ OpenRouter  │                │    Postmark     │
         │   (AI)      │                │   (Email)       │
         └─────────────┘                └─────────────────┘
```

### Data Flow

1. **Input Sources**:
   - Web form: URL/HTML/Instructions
   - Chrome Extension: Page content + Screenshots
   - Email: Inbound to Postmark → Webhook → PHP

2. **Processing Pipeline**:
   - Content extraction (HTML/PDF/Text)
   - AI analysis via OpenRouter
   - ICS generation using eluceo/ical
   - Optional review step
   - Email delivery via Postmark

3. **State Management**:
   - Server: Session-based for web, token-based for review
   - Extension: chrome.storage.sync for preferences
   - No cross-tab state currently

## Implementation Plan

### Phase 1: Foundation Improvements

#### 1.1 Enhanced AI Prompts & Event Naming

**Files to modify**:
- `index.php`: Update `generateIcalEvent()` method

**Implementation**:
```php
private function generateIcalEvent($content, $userInstructions = '', $url = '', $useVision = false, $allowMultiDay = false) {
    $systemPrompt = $this->buildEnhancedSystemPrompt($allowMultiDay);
    
    // Enhanced prompt with artistic event detection
    $enhancedInstructions = <<<PROMPT
# Event Extraction Guidelines

## For Artistic/Cultural Events:
- Format: "Venue - Artist/Show" (e.g., "SF Opera - La Boheme", "Stern Grove - The Honeydrops")
- Include full performance program in description
- Highlight featured artists prominently
- Extract repertoire/setlist if available

## For Multi-Session Events:
- Identify if this is a multi-day conference, festival, or series
- Extract each session/day as separate event if requested
- Link related events in description

## Rich Descriptions Should Include:
- Featured performers/speakers
- Program details or agenda
- Ticket/registration information
- Venue details and accessibility
- Preparation or arrival instructions
PROMPT;

    $messages = [
        ['role' => 'system', 'content' => $systemPrompt],
        ['role' => 'user', 'content' => $this->buildUserPrompt($content, $userInstructions . "\n\n" . $enhancedInstructions, $url)]
    ];
}
```

#### 1.2 Model Picker for Web Form

**Files to modify**:
- `form.html`: Add model selection dropdown

**Implementation**:
```html
<!-- Add after instructions textarea -->
<div class="mb-3">
    <label for="model" class="form-label">AI Model:</label>
    <select class="form-control" id="model" name="model">
        <option value="">Loading models...</option>
    </select>
    <small class="form-text text-muted">Select AI model for event extraction</small>
</div>

<script>
// Load models on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/?get_models=1', {
            credentials: 'include'
        });
        const data = await response.json();
        
        const modelSelect = document.getElementById('model');
        modelSelect.innerHTML = '<option value="">Default Model</option>';
        
        if (data.models && Array.isArray(data.models)) {
            data.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name + (model.vision_capable ? ' (Vision)' : '');
                if (model.default) option.selected = true;
                modelSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load models:', error);
    }
});
</script>
```

### Phase 2: Multi-Day Event Support

#### 2.1 Backend Schema Changes

**Files to modify**:
- `index.php`: Update JSON schema

**Implementation**:
```php
private function getEventJsonSchema($allowMultiDay = false) {
    $baseEventSchema = [
        'type' => 'object',
        'properties' => [
            'summary' => ['type' => 'string'],
            'dtstart' => ['type' => 'string'],
            'dtend' => ['type' => 'string'],
            'location' => ['type' => 'string'],
            'description' => ['type' => 'string']
        ],
        'required' => ['summary', 'dtstart', 'dtend']
    ];
    
    if ($allowMultiDay) {
        return [
            'type' => 'object',
            'properties' => [
                'eventType' => [
                    'type' => 'string',
                    'enum' => ['single', 'multi-day', 'series']
                ],
                'events' => [
                    'type' => 'array',
                    'items' => $baseEventSchema,
                    'minItems' => 1,
                    'maxItems' => 30
                ],
                // Single event fallback
                'summary' => ['type' => 'string'],
                'dtstart' => ['type' => 'string'],
                'dtend' => ['type' => 'string'],
                'location' => ['type' => 'string'],
                'description' => ['type' => 'string']
            ],
            'oneOf' => [
                ['required' => ['events', 'eventType']],
                ['required' => ['summary', 'dtstart', 'dtend']]
            ]
        ];
    }
    
    return $baseEventSchema;
}
```

#### 2.2 ICS Generator Updates

**Files to modify**:
- `IcalGenerator.php`: Add multi-event support

**Implementation**:
```php
public function convertMultipleEventsToIcs(array $events, bool $tentative = true): string {
    $calendar = new Calendar();
    
    foreach ($events as $index => $eventData) {
        $event = new Event();
        $event->setSummary($eventData['summary'])
              ->setDtStart(new DateTime($eventData['dtstart']))
              ->setDtEnd(new DateTime($eventData['dtend']));
              
        if (!empty($eventData['location'])) {
            $event->setLocation($eventData['location']);
        }
        
        if (!empty($eventData['description'])) {
            $event->setDescription($eventData['description']);
        }
        
        // Link events in series
        if (count($events) > 1) {
            $event->setDescription(
                $event->getDescription() . "\n\n" .
                "Part " . ($index + 1) . " of " . count($events) . " in series"
            );
        }
        
        $event->setStatus($tentative ? Event::STATUS_TENTATIVE : Event::STATUS_CONFIRMED);
        $calendar->addComponent($event);
    }
    
    return $calendar->render();
}
```

#### 2.3 UI Updates

**Files to modify**:
- `form.html`: Add multi-day checkbox
- `chrome-extension/popup.html`: Add multi-day option
- `chrome-extension/popup.js`: Handle multi-day parameter

**Form.html implementation**:
```html
<div class="form-check mb-3">
    <input class="form-check-input" type="checkbox" id="multiday" name="multiday" value="1">
    <label class="form-check-label" for="multiday">
        Allow multiple events (conferences, multi-day trips, etc.)
    </label>
</div>
```

### Phase 3: Chrome Extension Improvements

#### 3.1 Tab-Specific State Management

**Files to modify**:
- `chrome-extension/popup.js`: Implement tab-aware storage

**Implementation**:
```javascript
// Tab state manager
class TabStateManager {
    constructor() {
        this.tabId = null;
        this.stateKey = null;
    }
    
    async initialize() {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        this.tabId = tab.id;
        this.stateKey = `tab_${this.tabId}_state`;
        
        // Listen for tab changes
        chrome.tabs.onActivated.addListener(async (activeInfo) => {
            if (activeInfo.tabId !== this.tabId) {
                await this.saveState();
                this.tabId = activeInfo.tabId;
                this.stateKey = `tab_${this.tabId}_state`;
                await this.restoreState();
            }
        });
        
        // Save state when popup closes
        window.addEventListener('unload', () => this.saveState());
    }
    
    async saveState() {
        const state = {
            formData: {
                url: document.getElementById('url')?.value || '',
                instructions: document.getElementById('instructions')?.value || '',
                model: document.getElementById('model-select')?.value || '',
                tentative: document.getElementById('tentative-toggle')?.checked,
                reviewOption: document.querySelector('input[name="review-option"]:checked')?.value,
                multiday: document.getElementById('multiday-toggle')?.checked
            },
            timestamp: Date.now()
        };
        
        await chrome.storage.local.set({[this.stateKey]: state});
    }
    
    async restoreState() {
        const result = await chrome.storage.local.get([this.stateKey]);
        const state = result[this.stateKey];
        
        if (state && (Date.now() - state.timestamp) < 3600000) { // 1 hour
            const form = state.formData;
            if (form.url) document.getElementById('url').value = form.url;
            if (form.instructions) document.getElementById('instructions').value = form.instructions;
            if (form.model) document.getElementById('model-select').value = form.model;
            if (form.tentative !== undefined) document.getElementById('tentative-toggle').checked = form.tentative;
            if (form.reviewOption) {
                document.querySelector(`input[name="review-option"][value="${form.reviewOption}"]`).checked = true;
            }
            if (form.multiday !== undefined) document.getElementById('multiday-toggle').checked = form.multiday;
        }
    }
    
    async cleanup() {
        // Clean up old states
        const allItems = await chrome.storage.local.get(null);
        const now = Date.now();
        const keysToRemove = [];
        
        for (const key in allItems) {
            if (key.startsWith('tab_') && key.endsWith('_state')) {
                const state = allItems[key];
                if (now - state.timestamp > 86400000) { // 24 hours
                    keysToRemove.push(key);
                }
            }
        }
        
        if (keysToRemove.length > 0) {
            await chrome.storage.local.remove(keysToRemove);
        }
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
    const stateManager = new TabStateManager();
    await stateManager.initialize();
    await stateManager.restoreState();
    
    // Periodic cleanup
    setInterval(() => stateManager.cleanup(), 3600000); // Every hour
});
```

#### 3.2 Fix Review Mode

**Files to modify**:
- `chrome-extension/popup.js`: Fix review display logic

**Implementation**:
```javascript
// Fix the showReviewSection function
function showReviewSection(data) {
    console.log("showReviewSection called with data:", data);
    
    // Ensure we have required data
    if (!data.confirmationToken || !data.icsContent) {
        console.error("Missing required review data");
        showStatus('Error: Missing review data', 'error', true);
        return;
    }
    
    // Store review data
    reviewData = {
        confirmationToken: data.confirmationToken,
        recipientEmail: data.recipientEmail || 'Unknown',
        emailSubject: data.emailSubject || 'Calendar Event',
        icsContent: data.icsContent
    };
    
    // Update UI
    reviewRecipient.textContent = reviewData.recipientEmail;
    reviewSubject.textContent = reviewData.emailSubject;
    
    // Parse and display ICS content
    try {
        reviewContent.innerHTML = parseAndDisplayIcs(reviewData.icsContent);
    } catch (error) {
        console.error("Error parsing ICS:", error);
        reviewContent.innerHTML = '<pre>' + escapeHtml(reviewData.icsContent) + '</pre>';
    }
    
    // Show review section, hide others
    formSection.style.display = 'none';
    processingView.style.display = 'none';
    reviewSection.style.display = 'block';
    
    hideStatus();
    hideReviewStatus();
    disableReviewButtons(false);
}

// Helper function for HTML escaping
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
```

### Phase 4: iOS Shortcut Support

#### 4.1 Create iOS Endpoint

**Files to create**:
- `ios-shortcut.php`: Dedicated iOS endpoint

**Implementation**:
```php
<?php
require_once 'index.php';

// iOS Shortcut endpoint
header('Content-Type: application/json');

// Simplified response for Shortcuts app
try {
    $processor = new EmailProcessor();
    
    $input = json_decode(file_get_contents('php://input'), true);
    $url = $input['url'] ?? $_POST['url'] ?? '';
    $html = $input['html'] ?? $_POST['html'] ?? '';
    $screenshot = $input['screenshot'] ?? $_POST['screenshot'] ?? '';
    
    // Process the event
    $result = $processor->processWebContent($url, $html, '', [
        'screenshot' => $screenshot,
        'tentative' => true,
        'multiday' => $input['multiday'] ?? false
    ]);
    
    // Return simplified response
    echo json_encode([
        'success' => true,
        'event' => $result['event'],
        'ics_content' => $result['ics'],
        'preview_url' => $result['preview_url'] ?? null
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
```

#### 4.2 iOS Shortcut Template

**Files to create**:
- `docs/ios-shortcut-setup.md`: Setup instructions

**Content**:
```markdown
# iOS Shortcut Setup

## Installation

1. Install the Shortcuts app (pre-installed on iOS 13+)
2. Open this link on your iPhone: [Install Email-to-ICS Shortcut](https://www.icloud.com/shortcuts/YOUR_SHORTCUT_ID)
3. Tap "Add Shortcut"
4. Configure your server URL when prompted

## Manual Setup

1. Create new shortcut
2. Add actions:
   - Get Contents of Web Page
   - Get Contents of URL (POST to your-server/ios-shortcut.php)
   - Show Result

## Usage

- Share any webpage to the shortcut
- Or run from Shortcuts app
- Review the extracted event
- Add to calendar or share
```

### Phase 5: Attachment Handling

#### 5.1 Create Upload Directory

**Implementation**:
```bash
mkdir -p uploads
chmod 755 uploads
echo "deny from all" > uploads/.htaccess
```

#### 5.2 Attachment Processing

**Files to modify**:
- `index.php`: Add attachment handling

**Implementation**:
```php
private function processAttachments($attachments, $eventData) {
    $uploadDir = __DIR__ . '/uploads/';
    $attachmentLinks = [];
    
    foreach ($attachments as $attachment) {
        // Generate filename
        $eventDate = date('Y-m-d', strtotime($eventData['dtstart']));
        $eventSummary = preg_replace('/[^a-zA-Z0-9-_]/', '', 
            substr($eventData['summary'], 0, 30));
        $filename = "{$eventDate}-{$eventSummary}-{$attachment['name']}";
        
        // Save file
        $filepath = $uploadDir . $filename;
        file_put_contents($filepath, $attachment['content']);
        
        // Generate secure link
        $token = bin2hex(random_bytes(16));
        $this->storeAttachmentToken($token, $filename);
        
        $attachmentLinks[] = [
            'name' => $attachment['name'],
            'url' => "/attachment/{$token}"
        ];
    }
    
    // Add to description
    if (!empty($attachmentLinks)) {
        $eventData['description'] .= "\n\nAttachments:\n";
        foreach ($attachmentLinks as $link) {
            $eventData['description'] .= "- {$link['name']}: {$link['url']}\n";
        }
    }
    
    return $eventData;
}
```

### Phase 6: Bug Analysis & Fixes

#### 6.1 Known Issues to Address

1. **CORS Headers Missing**: Move CORS headers into request handling
2. **Token Expiration**: Implement proper TTL for review tokens
3. **Memory Leaks**: Chrome extension needs cleanup for old states
4. **Error Handling**: Improve error messages and recovery
5. **Race Conditions**: Multiple rapid submissions cause conflicts

## Testing Strategy

### Unit Tests Needed

1. Multi-event parsing
2. Attachment filename generation
3. Tab state management
4. iOS response formatting

### Integration Tests

1. End-to-end multi-day event flow
2. Chrome extension state persistence
3. iOS Shortcut execution
4. File upload security

### Performance Tests

1. Multi-event AI processing time
2. Large attachment handling
3. Concurrent tab usage

## Security Considerations

1. **File Upload Security**:
   - Validate MIME types
   - Scan for malware
   - Enforce size limits
   - Sanitize filenames

2. **Token Management**:
   - Use cryptographically secure tokens
   - Implement expiration
   - Rate limit token generation

3. **Input Validation**:
   - Sanitize all user inputs
   - Validate event data structure
   - Prevent XSS in descriptions

## Deployment Notes

1. **Database Migrations**: None required (file-based storage)
2. **Config Changes**: Update .env.template with new options
3. **Permissions**: Set appropriate file permissions for uploads
4. **Monitoring**: Add logging for new features
5. **Rollback Plan**: Feature flags for gradual rollout

This architecture provides a solid foundation for implementing all requested features while maintaining system stability and security.