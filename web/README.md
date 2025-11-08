# Hannan Call - React Web Frontend

Complete React web implementation for one-to-one voice calling with WebSocket signaling and WebRTC.

## Features

- ✅ User selection screen to choose your identity
- ✅ User list with search functionality
- ✅ WebSocket connection via STOMP + SockJS
- ✅ WebRTC peer-to-peer voice calling
- ✅ Call states: Calling, Incoming, In-Call
- ✅ Mute/Unmute and Speaker controls
- ✅ Call duration timer
- ✅ Ringtone for incoming calls
- ✅ Responsive design

## Setup Instructions

### 1. Install Dependencies

```bash
cd web
npm install
```

### 2. Configure Backend URL

Edit `src/context/CallContext.js` and update:

```javascript
const WEBSOCKET_URL = 'https://8hspqmjm-8008.inc1.devtunnels.ms/ws';
```

Replace with your Spring Boot server URL.

### 3. Add Ringtone

Copy your ringtone file to `public/ringtone/ring.mp3`:

```bash
mkdir -p public/ringtone
cp ../src/ringtone/ring.mp3 public/ringtone/
```

### 4. Run the App

```bash
npm start
```

The app will open at `http://localhost:3000`

## Project Structure

```
web/
├── public/
│   ├── index.html
│   └── ringtone/
│       └── ring.mp3
├── src/
│   ├── context/
│   │   └── CallContext.js       # WebSocket + WebRTC logic
│   ├── screens/
│   │   ├── LoginScreen.js       # User selection
│   │   ├── UserSelectionScreen.js
│   │   ├── CallingScreen.js
│   │   ├── IncomingCallScreen.js
│   │   └── InCallScreen.js
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
└── package.json
```

## How It Works

### Call Flow

1. **User A initiates call**
   - Selects User B from list
   - Sends `/app/call/{A}/{B}/initiate`
   - Shows "Calling..." screen

2. **User B receives call**
   - Gets notification on `/topic/call/{B}`
   - Shows "Incoming Call" screen with ringtone
   - Can Accept or Reject

3. **User B accepts**
   - Sends `/app/call/{A}/{B}/accept`
   - Both users establish WebRTC connection
   - Exchange offer/answer/ICE candidates

4. **In-Call**
   - Both users can mute/unmute
   - Call duration timer
   - Either can end call

5. **Call ends**
   - Sends `/app/call/{A}/{B}/end`
   - Cleanup streams and connections

## Testing

### Option 1: Multiple Browsers
1. Open Chrome with user1
2. Open Firefox with user2
3. Call between browsers

### Option 2: Multiple Tabs (Different Ports)
1. Terminal 1: `PORT=3000 npm start` (user1)
2. Terminal 2: `PORT=3001 npm start` (user2)
3. Call between tabs

### Option 3: Incognito Mode
1. Normal window: user1
2. Incognito window: user2
3. Call between windows

## Browser Permissions

### Important: Run on localhost
The app MUST run on localhost for microphone access:
```bash
npm start  # Opens http://localhost:3000
```

Do NOT open the HTML file directly (file://) - it won't work!

### Allowing Microphone Access
1. Click "Allow Microphone Access" button on login screen
2. Browser will show permission prompt
3. Click "Allow"
4. If you accidentally clicked "Block", see [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

## Troubleshooting

### WebSocket Connection Issues
- Verify backend is running on port 8008
- Check CORS settings in Spring Boot
- Open browser console for error messages

### Audio Not Working
- Check microphone permissions in browser
- Verify WebRTC peer connection state in console
- Check ICE candidate exchange

### Ringtone Not Playing
- Ensure `public/ringtone/ring.mp3` exists
- Check browser autoplay policies
- User interaction may be required first

## Backend Requirements

Your Spring Boot backend must be running with:
- WebSocket endpoint: `/ws`
- STOMP broker: `/topic`, `/queue`
- Application prefix: `/app`
- Controller: `HannanCallController`
- CORS enabled for `http://localhost:3000`

## Production Build

```bash
npm run build
```

Serve the `build` folder with any static file server.

## Notes

- Replace mock user list with real API
- Add user authentication
- Implement call history
- Add video calling support
- Handle network disconnections
- Add call quality indicators
- Implement push notifications for incoming calls
