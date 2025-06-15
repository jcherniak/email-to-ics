# iOS Shortcut Setup for Email-to-ICS

## Quick Setup

1. Open this link on your iPhone: [Create iOS Shortcut](shortcuts://create-shortcut)
2. Add these actions in order:

### Shortcut Actions:

1. **Get Contents of Web Page**
   - Input: Ask for Input (URL)
   - Advanced: Send Headers = "User-Agent: Shortcuts/1.0"

2. **Set Variable**
   - Variable Name: "PageHTML"
   - Input: Contents of Web Page

3. **Ask for Input**
   - Input Type: Text
   - Prompt: "Any special instructions?"
   - Variable Name: "Instructions"

4. **Get Contents of URL**
   - URL: `https://YOUR-SERVER.com/index.php`
   - Method: POST
   - Headers:
     - Content-Type: application/x-www-form-urlencoded
   - Request Body (Form):
     - url: [URL from step 1]
     - html: [PageHTML variable]
     - instructions: [Instructions variable]
     - display: email
     - tentative: 1
     - fromShortcut: true

5. **Get Text from Input**
   - Input: Contents of URL

6. **Show Result**
   - Text: Contents from previous step

## Alternative Simple Version

For a minimal setup, create a shortcut that:

1. **Ask for Input** (URL)
2. **Open URL**: `https://YOUR-SERVER.com/form.html?url=[input]`

This will open the web form pre-filled with the URL.

## Usage

- Share any webpage to the shortcut
- Or run manually and paste a URL
- Add any special instructions when prompted
- The event will be processed and emailed

## Notes

- Replace `YOUR-SERVER.com` with your actual server URL
- Screenshots are not currently supported in iOS Shortcuts
- For authentication, you may need to log into the web interface first