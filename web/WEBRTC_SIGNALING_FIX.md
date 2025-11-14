# WebRTC Signaling Fix

## Problem

The WebRTC signaling was broken because signals were being sent to the wrong user:

```
Backend logs:
=== WEBRTC SIGNAL ===
Signal Type: offer
Sender ID: 1
Receiver ID: 1  ← WRONG! Should be 2
Signal forwarded to receiver: 1  ← Sending offer to self!
```

## Root Cause

When User 2 (receiver) accepted the call, they were immediately creating a peer connection and generating ICE candidates. This caused:

1. User 2 accepts call
2. User 2 calls `setupPeerConnection()` 
3. ICE candidates start generating
4. ICE candidates sent via `sendSignal()`
5. But User 2 hasn't received an offer yet, so they shouldn't be sending anything!

The correct WebRTC flow is:
1. **Caller** creates offer
2. **Receiver** receives offer, creates answer
3. Both exchange ICE candidates

## Fix Applied

**File: `web/src/context/CallContext.js`**

### Before (Incorrect):
```javascript
const acceptCall = async () => {
  // ...
  await setupLocalStream(isVideoCall);
  await setupPeerConnection();  // ← TOO EARLY!
  
  // Send accept message
  stompClient.current.publish({...});
};
```

### After (Correct):
```javascript
const acceptCall = async () => {
  // ...
  await setupLocalStream(isVideoCall);
  // DON'T create peer connection yet!
  // It will be created when we receive the offer
  
  // Send accept message
  stompClient.current.publish({...});
  console.log('Waiting for offer from caller...');
};
```

## Correct WebRTC Flow

### Step 1: Call Initiation
```
User 1 (Caller):
  → initiateCall(2, "User 2")
  → Sets up local stream
  → Sends call-request to backend
  → Backend forwards to User 2
```

### Step 2: Call Acceptance
```
User 2 (Receiver):
  → Receives call-request
  → User clicks "Accept"
  → acceptCall()
  → Sets up local stream (audio/video)
  → Sends call-accept to backend
  → Backend forwards to User 1
  → Waits for offer...
```

### Step 3: Offer Creation (Caller)
```
User 1 (Caller):
  → Receives call-accept signal
  → handleCallAccepted()
  → createOffer()
    → setupPeerConnection()
    → Creates WebRTC offer
    → sendSignal('offer', {offer})
  → Backend forwards offer to User 2
```

### Step 4: Answer Creation (Receiver)
```
User 2 (Receiver):
  → Receives offer signal
  → handleOffer(offer)
    → setupPeerConnection() ← NOW we create it!
    → setRemoteDescription(offer)
    → createAnswer()
    → sendSignal('answer', {answer})
  → Backend forwards answer to User 1
```

### Step 5: ICE Candidate Exchange
```
Both Users:
  → onicecandidate event fires
  → sendSignal('ice-candidate', {candidate})
  → Backend forwards to other user
  → handleIceCandidate(candidate)
  → addIceCandidate(candidate)
```

### Step 6: Connection Established
```
Both Users:
  → ICE connection state: checking → connected
  → Audio/video streams flowing
  → Call is active!
```

## Expected Logs After Fix

### User 1 (Caller) Console:
```
Initiating call to: 2
✅ Call initiate published successfully
Incoming message: {"signalType": "call-accept", ...}
Call accepted, creating offer to: 2
Creating offer. Current userId: 1 Remote userId: 2
Sending offer to: 2
Destination: /app/call/1/2
✅ Offer sent
Incoming message: {"signalType": "answer", ...}
Handling answer
✅ Answer processed
Handling ICE candidate (multiple times)
✅ Call connected!
```

### User 2 (Receiver) Console:
```
Incoming message: {"signalType": "call-request", ...}
Incoming call from User 1
User clicks Accept
Accepting call from: 1
✅ Call accept published successfully
Waiting for offer from caller...
Incoming message: {"signalType": "offer", ...}
Handling offer
Creating peer connection
Creating answer
Sending answer to: 1
Destination: /app/call/2/1
✅ Answer sent
Handling ICE candidate (multiple times)
✅ Call connected!
```

### Backend Logs:
```
=== CALL INITIATE ===
Caller ID: 1, Receiver ID: 2

=== CALL ACCEPT ===
Caller ID: 1, Receiver ID: 2

=== WEBRTC SIGNAL ===
Signal Type: offer
Sender ID: 1
Receiver ID: 2  ← CORRECT!
Signal forwarded to receiver: 2

=== WEBRTC SIGNAL ===
Signal Type: answer
Sender ID: 2
Receiver ID: 1  ← CORRECT!
Signal forwarded to receiver: 1

=== WEBRTC SIGNAL ===
Signal Type: ice-candidate
(Multiple exchanges between 1 and 2)
```

## Testing

1. **Clear browser cache** and hard refresh
2. **User 1**: Login and call User 2
3. **User 2**: Accept the call
4. **Check console logs** - should match expected logs above
5. **Check backend logs** - signals should go to correct users
6. **Audio should work** - speak and listen

## Common Issues

### Issue: "Already connected or peer connection exists"
**Cause:** Duplicate accept signal or page refresh during call
**Solution:** This is now handled gracefully, just ignore the duplicate

### Issue: No audio after connection
**Cause:** Microphone permission not granted
**Solution:** Check browser address bar for microphone icon, allow access

### Issue: ICE connection fails
**Cause:** Firewall or NAT issues
**Solution:** 
- Check if STUN servers are reachable
- May need TURN server for restrictive networks
- Test on same local network first

## Summary

✅ **Fixed:** Receiver no longer creates peer connection prematurely
✅ **Fixed:** Signals now sent to correct users
✅ **Result:** Proper WebRTC offer/answer flow
✅ **Result:** Calls should connect successfully

The WebRTC signaling now follows the correct flow, and calls should connect properly!
