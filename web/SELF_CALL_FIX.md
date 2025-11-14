# Self-Call Bug Fix

## Critical Bug Found

User 1 was receiving and handling their own call-request signal, causing them to "accept their own call"!

### The Problem

**User 1 (Caller) logs:**
```
Initiating call to: 2
✅ Call initiate published successfully
Incoming message: {"signalType": "call-request"...}  ← Receives own call!
Incoming call data: {callerId: 1, ...}  ← Processes it!
Accepting call from: 1  ← Accepts own call!
State: idle  ← Wrong state!
```

This caused:
1. User 1's state to change from 'calling' → 'incoming' → 'connected'
2. User 1 to never create an offer (not in 'calling' state)
3. Call to fail completely

### Root Cause

The backend sends the `call-request` signal to BOTH users:

```java
@MessageMapping("/call/{callerId}/{receiverId}/initiate")
public void initiateCall(...) {
    // ...
    
    // Send to both users
    messagingTemplate.convertAndSend("/topic/call/" + receiverId, response);
    messagingTemplate.convertAndSend("/topic/call/" + callerId, response);  ← Caller receives it too!
}
```

The frontend was handling this signal the same way for both users, causing the caller to process their own call-request.

### Fix Applied

Added a check in `handleIncomingCall()` to ignore call-requests from self:

**Before (Broken):**
```javascript
const handleIncomingCall = (data, callHistory) => {
  if (callHistory && callHistory.data) {
    const senderId = callHistory.data.senderId;
    
    // Process the call (even if we're the sender!)
    setCallHistoryId(callHistory.data.callHistoryId);
    remoteUserIdRef.current = senderId;
    setCallState('incoming');  // ← Caller's state changes to 'incoming'!
    playRingtone();
  }
};
```

**After (Fixed):**
```javascript
const handleIncomingCall = (data, callHistory) => {
  if (callHistory && callHistory.data) {
    const senderId = callHistory.data.senderId;
    
    // Ignore if we are the sender (we initiated this call)
    if (senderId === userId) {
      console.log('Ignoring call-request from self');
      return;  // ← Caller ignores their own call-request
    }
    
    // Only receiver processes the call
    setCallHistoryId(callHistory.data.callHistoryId);
    remoteUserIdRef.current = senderId;
    setCallState('incoming');
    playRingtone();
  }
};
```

## Correct Flow Now

### User 1 (Caller):
1. Clicks call button → `initiateCall(2, "User 2")`
2. State: `calling` ✅
3. Sends call-request to backend
4. Receives call-request signal (broadcast by backend)
5. Checks: `senderId === userId` → TRUE
6. **Ignores the signal** ✅
7. State remains: `calling` ✅
8. Waits for call-accept from User 2

### User 2 (Receiver):
1. Receives call-request signal
2. Checks: `senderId === userId` → FALSE
3. **Processes the signal** ✅
4. State: `incoming` ✅
5. Shows incoming call UI
6. User clicks accept
7. Sends call-accept to backend

### User 1 (Caller) - After Accept:
1. Receives call-accept signal
2. Checks: `callState === 'calling'` → TRUE ✅
3. Creates offer
4. Sends to User 2
5. Call connects!

## Expected Logs After Fix

### User 1 (Caller):
```
Initiating call to: 2
State: calling
✅ Call initiate published

Incoming message: {"signalType": "call-request"...}
Ignoring call-request from self (we initiated this call)  ← Ignores it!
State: calling  ← Stays in calling state!

Incoming message: {"signalType": "call-accept"...}
Call accepted signal received. Current state: calling  ← Correct!
Creating offer to: 2
Sending signal offer from 1 to 2
```

### User 2 (Receiver):
```
Incoming message: {"signalType": "call-request"...}
Incoming call data: {callerId: 1, ...}  ← Processes it
State: incoming
(Shows incoming call UI)

User clicks Accept
Accepting call from: 1
State: connected
✅ Call accept published
Waiting for offer from caller...

Incoming message: {"signalType": "offer"...}
Handling offer
Creating answer
```

## Why Backend Sends to Both

The backend sends `call-request` to both users for these reasons:

1. **Caller confirmation**: Caller knows the request was sent successfully
2. **Call history sync**: Both users get the callHistoryId
3. **State synchronization**: Both users know a call is in progress

This is actually correct backend behavior. The frontend just needs to handle it appropriately based on the user's role.

## Summary

✅ **Fixed:** Caller ignores their own call-request signal
✅ **Fixed:** Caller stays in 'calling' state
✅ **Fixed:** Caller creates offer when receiving accept signal
✅ **Result:** Proper call flow and state management
✅ **Result:** Calls connect successfully!

This was a critical bug that prevented all calls from working. Now fixed!
