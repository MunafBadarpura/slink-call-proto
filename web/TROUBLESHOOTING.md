# Troubleshooting Microphone Permission Issues

## Problem: "Microphone access denied" without browser prompt

### Solution 1: Use localhost (Recommended)
Browsers require HTTPS or localhost for microphone access.

**Run the app properly:**
```bash
cd web
npm start
```

This will automatically open `http://localhost:3000` which is allowed by browsers.

### Solution 2: Check if permission was previously blocked

**Chrome:**
1. Click the 🔒 lock icon (or ⓘ info icon) in the address bar
2. Find "Microphone" in the permissions list
3. Change from "Block" to "Allow"
4. Refresh the page
5. Click "Allow Microphone Access" button again

**Firefox:**
1. Click the 🔒 lock icon in the address bar
2. Click the arrow next to "Blocked" or "Connection Secure"
3. Find "Use the Microphone"
4. Click "X" to clear blocked permissions
5. Refresh the page
6. Click "Allow Microphone Access" button again

**Edge:**
1. Click the 🔒 lock icon in the address bar
2. Click "Permissions for this site"
3. Find "Microphone"
4. Change to "Allow"
5. Refresh the page
6. Click "Allow Microphone Access" button again

### Solution 3: Reset site permissions

**Chrome:**
1. Go to `chrome://settings/content/microphone`
2. Find your site in the "Block" list
3. Click the trash icon to remove it
4. Refresh your app
5. Try again

**Firefox:**
1. Go to `about:preferences#privacy`
2. Scroll to "Permissions" → "Microphone"
3. Click "Settings"
4. Find your site and remove it
5. Refresh your app
6. Try again

### Solution 4: Check if microphone is available

**Windows:**
1. Right-click the speaker icon in taskbar
2. Select "Sound settings"
3. Scroll to "Input"
4. Make sure a microphone is selected and working
5. Test your microphone

**Mac:**
1. Open System Preferences
2. Go to "Sound" → "Input"
3. Make sure a microphone is selected
4. Check the input level

### Solution 5: Check if another app is using the microphone

Close these apps if running:
- Zoom
- Microsoft Teams
- Skype
- Discord
- OBS Studio
- Any other video/audio recording software

### Solution 6: Try a different browser

If one browser isn't working, try:
- Google Chrome
- Mozilla Firefox
- Microsoft Edge

### Solution 7: Check browser console for errors

1. Press F12 to open Developer Tools
2. Go to "Console" tab
3. Click "Allow Microphone Access" button
4. Look for error messages
5. Share the error message for further help

## Common Error Messages

### "NotAllowedError" or "PermissionDeniedError"
- You clicked "Block" on the permission prompt
- Follow Solution 2 or 3 above

### "NotFoundError"
- No microphone detected
- Follow Solution 4 above

### "NotReadableError"
- Microphone is being used by another app
- Follow Solution 5 above

### "NotSupportedError"
- Not using HTTPS or localhost
- Follow Solution 1 above

## Still Not Working?

1. Restart your browser completely
2. Restart your computer
3. Update your browser to the latest version
4. Check if your antivirus is blocking microphone access
5. Try running the app with: `npm start` (not opening the HTML file directly)

## Testing Microphone

Visit this site to test if your microphone works in the browser:
https://www.onlinemictest.com/

If it doesn't work there, the issue is with your system/browser, not the app.
