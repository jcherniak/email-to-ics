# Email to ICS Converter - Installation Guide

This Chrome extension converts emails and web content into ICS calendar files using AI models. It now comes in two versions: one for Chrome/Chromium browsers and one optimized for Orion Browser.

## 📦 Package Contents

After building, you'll find these packages in the `build/` directory:

- `email-to-ics-chrome.zip` - Chrome/Chromium/Edge version
- `email-to-ics-orion.zip` - Orion Browser optimized version

## 🚀 Installation Instructions

### For Chrome/Chromium/Edge Browsers

1. **Download and Extract**
   - Download `email-to-ics-chrome.zip`
   - Extract the ZIP file to a folder on your computer

2. **Load Extension**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the extracted `chrome` folder

3. **Verify Installation**
   - The extension icon should appear in your toolbar
   - Right-click on any webpage to see "Convert to ICS Calendar Event" context menu

### For Orion Browser

1. **Download and Extract**
   - Download `email-to-ics-orion.zip`
   - Extract the ZIP file to a folder on your computer

2. **Load Extension**
   - Open Orion Browser
   - Go to Settings → Extensions
   - Enable "Developer Extensions"
   - Click "Load Unpacked Extension"
   - Select the extracted `orion` folder

3. **Verify Installation**
   - The extension should appear in your extensions list
   - The popup should be accessible from the toolbar

## ⚙️ Initial Setup

### Required API Keys

Before using the extension, you need to configure these API keys:

1. **OpenRouter API Key** (Required)
   - Sign up at https://openrouter.ai/
   - Generate an API key
   - Used for AI-powered event extraction

2. **Postmark API Key** (Required)
   - Sign up at https://postmarkapp.com/
   - Create a server and generate an API key
   - Used for sending calendar invites via email

### Configuration Steps

1. **Open Extension Settings**
   - Click the extension icon in your toolbar
   - Click "Settings" button
   - Or right-click the extension icon → Options

2. **Enter API Keys**
   - Fill in your OpenRouter API Key
   - Fill in your Postmark API Key
   - Configure email addresses:
     - **From Email**: Your sender email (must be verified in Postmark)
     - **Tentative Events Email**: Where tentative events are sent
     - **Confirmed Events Email**: Where confirmed events are sent

3. **Select AI Model**
   - Choose your preferred AI model from the dropdown
   - Recommended: Claude 3.5 Sonnet or GPT-4o

4. **Save Settings**
   - Click "Save Settings"
   - Settings are securely stored in browser sync storage

## 🎯 Usage

### Basic Usage

1. **Navigate to a webpage** with event information
2. **Click the extension icon** or use the context menu
3. **Fill in the form:**
   - URL is auto-filled
   - Add content/HTML if needed
   - Add special instructions
   - Choose tentative/confirmed status
   - Select review mode (direct send or review first)
4. **Click "Generate ICS"**

### Advanced Features

- **Screenshot Integration**: Enable to capture webpage screenshots for better AI analysis
- **Multi-day Events**: Toggle for events spanning multiple days
- **Review Mode**: Preview events before sending
- **Context Menu**: Right-click selected text → "Convert to ICS Calendar Event"

## 🔧 Browser-Specific Features

### Chrome/Edge Features
- Full Chrome Extension API support
- Advanced tab management
- Context menu integration
- Screenshot capture with zoom support

### Orion Browser Features
- Optimized for macOS and iOS
- Fallback mechanisms for limited API support
- LocalStorage fallbacks where needed
- Compatible with both Manifest V2 and WebExtensions

## 🧪 Testing

Both versions come with comprehensive test suites:

```bash
# Test core functionality
node test-processor.js

# Test Orion compatibility
node test-orion.js
```

## 📱 Platform Compatibility

### Chrome Version
- ✅ Chrome (Windows, macOS, Linux)
- ✅ Chromium-based browsers
- ✅ Microsoft Edge
- ✅ Brave Browser

### Orion Version
- ✅ Orion Browser (macOS)
- ⚠️ Orion Browser (iOS) - Limited API support
- ❌ Other browsers

## 🔒 Security & Privacy

- **API Keys**: Stored securely in browser sync storage
- **No Data Collection**: Extension doesn't collect or track user data
- **Local Processing**: Content analysis happens via secure API calls only
- **No External Dependencies**: Self-contained extension

## 🚨 Troubleshooting

### Common Issues

1. **"API key not configured" error**
   - Go to Settings and enter valid API keys
   - Ensure Postmark sender email is verified

2. **"Models not loading" error**
   - Check OpenRouter API key validity
   - Check internet connection
   - Clear extension storage and reconfigure

3. **"Email sending failed" error**
   - Verify Postmark API key
   - Ensure sender email is verified in Postmark
   - Check recipient email addresses

4. **Orion-specific issues**
   - Some features may be limited on iOS
   - Screenshots may not work on all Orion versions
   - Use fallback storage if sync issues occur

### Debug Mode

Enable debug logging by:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for extension debug messages

## 🔄 Updates

To update the extension:
1. Download the new version
2. Extract to the same folder (overwrite existing files)
3. Go to browser extensions page
4. Click "Reload" on the extension

## 📞 Support

For issues and feature requests:
- Check the troubleshooting section above
- Review browser console for error messages
- Verify API key configuration
- Test with different AI models

## 🎉 Success!

Once configured, you should be able to:
- Convert any webpage content to calendar events
- Send calendar invites automatically
- Review events before sending
- Use context menu for quick conversion
- Take screenshots for better AI analysis

The extension is now ready for standalone use without requiring a PHP backend server!