# Hannan Call - React Native WebRTC Call App

Complete React Native implementation for one-to-one voice calling with WebSocket signaling.

## Features

- ✅ Direct user ID configuration
- ✅ User list with search functionality
- ✅ WebSocket connection via STOMP + SockJS
- ✅ WebRTC peer-to-peer voice calling
- ✅ Call states: Calling, Incoming, In-Call
- ✅ Mute/Unmute and Speaker controls
- ✅ Call duration timer
- ✅ Ringtone for incoming calls

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. iOS Setup (if targeting iOS)

```bash
cd ios
pod install
cd ..
```

### 3. Configure User ID

Edit `App.js` and set your user ID:

```javascript
const CURRENT_USER_ID = 'user1'; // Change this for each device
```

### 4. Configure Backend URL

Edit `src/context/CallContext.js` and update:

```javascript
const WEBSOCKET_URL = 'http://YOUR_SERVER_IP:8008/ws';
```

Replace `YOUR_SERVER_IP` with your Spring Boot server IP address.

### 5. Setup Ringtone

The ringtone is located at `src/ringtone/ring.mp3`. You need to copy it to native folders:

**For Android:**
```bash
mkdir -p android/app/src/main/res/raw
cp src/ringtone/ring.mp3 android/app/src/main/res/raw/
```

**For iOS:**
- Open Xcode
- Drag `src/ringtone/ring.mp3` into your project
- Make sure "Copy items if needed" is checked
- Add to target

### 6. Android Permissions

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### 7. iOS Permissions

Add to `ios/YourAppName/Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>We need access to your microphone for voice calls</string>
```

## Running the App

```bash
# Android
npm run android

# iOS
npm run ios
```

## Project Structure

```
src/
├── context/
│   └── CallContext.js          # WebSocket + WebRTC logic
├── screens/
│   ├── UserSelectionScreen.js  # User list to call
│   ├── CallingScreen.js        # Outgoing call UI
│   ├── IncomingCallScreen.js   # Incoming call UI
│   └── InCallScreen.js         # Active call UI
└── App.js                      # Main app with user ID config
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

## WebSocket Events

| Event | Destination | Description |
|-------|-------------|-------------|
| `call-request` | `/topic/call/{userId}` | Incoming call notification |
| `call-accept` | `/topic/call/{userId}` | Call accepted |
| `call-reject` | `/topic/call/{userId}` | Call rejected |
| `call-end` | `/topic/call/{userId}` | Call ended |
| `offer` | `/topic/call/{userId}` | WebRTC offer |
| `answer` | `/topic/call/{userId}` | WebRTC answer |
| `ice-candidate` | `/topic/call/{userId}` | ICE candidate |

## Troubleshooting

### WebSocket Connection Issues
- Verify backend is running on port 8008
- Check firewall settings
- Use correct IP address (not localhost on physical devices)

### Audio Not Working
- Check microphone permissions
- Verify WebRTC peer connection state
- Check ICE candidate exchange

### Ringtone Not Playing
- Ensure ringtone file exists in correct location
- Check audio file format (MP3 recommended)
- Verify react-native-sound installation

## Testing

1. Run app on two devices/emulators
2. Set different user IDs in `App.js` (e.g., user1 on device 1, user2 on device 2)
3. From user1, tap on user2 to call
4. Accept call on user2
5. Test mute, speaker, and end call features

## Backend Requirements

Your Spring Boot backend must be running with:
- WebSocket endpoint: `/ws`
- STOMP broker: `/topic`, `/queue`
- Application prefix: `/app`
- Controller: `HannanCallController`

## Notes

- Replace mock user list with real API
- Add user authentication
- Implement call history
- Add video calling support
- Handle network disconnections
- Add call quality indicators
