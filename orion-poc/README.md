# iOS Orion WebExtensions API Test PoC

This proof-of-concept extension tests critical WebExtensions APIs needed for the email-to-ICS extension on iOS Orion browser.

## Purpose

Validate iOS Orion compatibility for:
- Storage API (local vs sync)
- Content script injection and communication
- Page content extraction
- Screenshot capture (expected to fail on iOS)
- Background script lifecycle
- Service worker limitations

## Testing Instructions

### Desktop Chrome (Baseline)
1. Open Chrome browser
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `orion-poc` folder
5. Click extension icon and test all features

### iOS Orion Browser
1. Install Orion browser on iOS device
2. Enable "Enable Web Extensions" in Orion settings
3. Copy extension files to iOS device (via AirDrop or cloud storage)
4. In Orion settings, go to "Extensions"
5. Select "Load Extension" and choose the folder
6. Test functionality and note any failures

## Expected Results

### Desktop Chrome (Control)
- ✅ Storage API: Both local and sync should work
- ✅ Content extraction: Should work via messaging or injection
- ✅ Screenshot: Should capture page screenshot
- ✅ Background script: Full service worker support

### iOS Orion (Test Target)
- ✅ Storage API: Local should work, sync may fail
- ⚠️ Content extraction: May require fallback to script injection
- ❌ Screenshot: Expected to fail (iOS Safari limitation)
- ⚠️ Background script: Limited lifecycle, no persistent state

## Key Findings to Document

1. **Storage Limitations**: Max size, sync availability
2. **Content Access**: Which injection methods work
3. **Background Persistence**: Service worker lifetime
4. **API Availability**: Which Chrome APIs are missing
5. **Performance**: Response times for API calls

## Critical for Main Extension

Based on test results, the main email-to-ICS extension will need:
- Fallback for screenshot capture (use server-side rendering)
- Simplified background script logic
- Local-only storage strategy
- Alternative content extraction methods

## Files

- `manifest.json`: iOS-compatible extension manifest
- `popup.html/js`: Test interface for API validation
- `content.js`: Page content extraction testing
- `background.js`: Service worker lifecycle testing
- `icon*.png`: **MANUAL STEP**: Add actual PNG icons (16x16, 48x48, 128x128) before testing

## Next Steps

After testing:
1. Document specific API limitations found
2. Update main extension architecture based on findings
3. Implement fallback strategies for missing APIs
4. Create iOS-specific build target if needed