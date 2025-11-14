# Backend-Frontend Integration Summary

## Backend API Endpoints

### 1. Call Initiate
**Endpoint:** `/app/call/{callerId}/{receiverId}/initiate`
**Payload:** `CallInitiateRequest { callType, signalData }`

**Backend Logic:**
1. Checks if either user is busy → sends `call-busy` if true
2. Marks both users as busy in Redis
3. Saves call history
4. Sends `call-request` to **BOTH** users (caller and receiver)

**Frontend Handling:**
- ✅ Caller ignores the `call-request` (we initiated it)
- ✅ Receiver processes it and shows incoming call UI

---

### 2. Call Accept
**Endpoint:** `/app/call/{callerId}/{receiverId}/accept`
**Payload:** `CallAcceptRequest { callHistoryId, signalData }`

**Backend Logic:**
1. Updates call history (sets call start time)
2. Sends `call-accept` to **BOTH** users

**Frontend Handling:**
- ✅ Caller (in 'calling' state) creates offer
- ✅ Receiver (in 'connected' state) ignores it

---

### 3. Call Reject
**Endpoint:** `/app/call/{callerId}/{receiverId}/reject`
**Payload:** `CallRejectRequest { callHistoryId, signalData }`

**Backend Logic:**
1. Frees both users from busy state
2. Updates call history (marks as rejected)
3. Sends `call-reject` to **BOTH** users

**Frontend Handling:**
- ✅ Both users cleanup and return to idle state

---

### 4. Call End
**Endpoint:** `/app/call/{callerId}/{receiverId}/end`
**Payload:** `CallEndRequest { callHistoryId, endedById, signalData }`

**Backend Logic:**
1. Frees both users from busy state
2. Updates call history (sets end time and who ended it)
3. Sends `call-end` to **BOTH** users

**Frontend Handling:**
- ✅ Both users cleanup and return to idle state

---

### 5. Call Not Answered
**Endpoint:** `/app/call/{callerId}/{receiverId}/notAnswered`
**Payload:** `CallNotAnsweredRequest { callHistoryId, signalData }`

**Backend Logic:**
1. Frees both users from busy state
2. Updates call history (marks as not answered)
3. Sends `call-not-answered` to **BOTH** users

**Frontend Handling:**
- ✅ Both users cleanup and return to idle state

---

### 6. WebRTC Signaling
**Endpoint:** `/app/call/{senderId}/{receiverId}`
**Payload:** `Map<String, Object>` with `signalType` (offer, answer, ice-candidate)

**Backend Logic:**
1. Extracts signal type
2. Forwards signal to **RECEIVER ONLY**

**Frontend Handling:**
- ✅ Receiver processes offer/answer/ICE candidates

---

## Key Backend Features

### Redis Busy State Management
```java
// Mark users as busy
redisService.markBusy(callerId, receiverId);
redisService.markBusy(receiverId, callerId);

// Check if busy
if (redisService.isBusy(userId)) { ... }

// Free from busy state
redisService.freeBusy(callerId);
redisService.freeBusy(receiverId);
```

### WebSocket Event Listener
```java
@EventListener
public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
    // Get userId from session
    Long userId = redisService.getUserBySession(sessionId);
    
    // If user was in a call, cleanup
    if (redisService.isBusy(userId)) {
        Long otherUserId = redisService.getBusyPair(userId);
        
        // Free both users
        redisService.freeBusy(userId);
        redisService.freeBusy(otherUserId);
        
        // Notify other user
        messagingTemplate.convertAndSend("/topic/call/" + otherUserId, 
            Map.of("signalType", "call-end", 
                   "signalData", Map.of("disconnectedUser", userId)));
    }
}
```

---

## Frontend State Machine

### User 1 (Caller)
```
idle 
  → initiateCall() 
  → calling 
  → receives call-accept 
  → creates offer 
  → connected 
  → endCall() 
  → idle
```

### User 2 (Receiver)
```
idle 
  → receives call-request 
  → incoming 
  → acceptCall() 
  → connected 
  → receives offer 
  → creates answer 
  → endCall() 
  → idle
```

---

## Signal Flow

### Complete Call Flow

1. **User 1 initiates call:**
   ```
   Frontend: initiateCall(2, "User 2")
   → Backend: /app/call/1/2/initiate
   → Backend sends: call-request to /topic/call/1 and /topic/call/2
   → User 1: Ignores (self-initiated)
   → User 2: Shows incoming call
   ```

2. **User 2 accepts call:**
   ```
   Frontend: acceptCall()
   → Backend: /app/call/1/2/accept
   → Backend sends: call-accept to /topic/call/1 and /topic/call/2
   → User 1: Creates offer (in 'calling' state)
   → User 2: Ignores (in 'connected' state)
   ```

3. **User 1 creates offer:**
   ```
   Frontend: createOffer()
   → Backend: /app/call/1/2 with signalType: offer
   → Backend sends: offer to /topic/call/2 ONLY
   → User 2: Receives offer, creates answer
   ```

4. **User 2 creates answer:**
   ```
   Frontend: createAnswer()
   → Backend: /app/call/2/1 with signalType: answer
   → Backend sends: answer to /topic/call/1 ONLY
   → User 1: Receives answer, connection established
   ```

5. **ICE candidates exchanged:**
   ```
   Both users:
   → Backend: /app/call/{senderId}/{receiverId} with signalType: ice-candidate
   → Backend forwards to other user
   → Connection established!
   ```

6. **Call ends:**
   ```
   Either user: endCall()
   → Backend: /app/call/{callerId}/{receiverId}/end
   → Backend sends: call-end to both users
   → Both users: Cleanup and return to idle
   ```

---

## Important Notes

### Why Backend Sends to Both Users

For call lifecycle events (initiate, accept, reject, end), the backend sends signals to **BOTH** users because:

1. **State Synchronization**: Both users need to know the call state
2. **Call History**: Both users get the callHistoryId
3. **Busy State**: Both users are marked as busy
4. **Confirmation**: Sender gets confirmation their action was processed

The frontend handles this by:
- Checking user role (caller vs receiver)
- Checking current state
- Ignoring signals that don't apply to them

### Why WebRTC Signals Go to One User

For WebRTC signaling (offer, answer, ICE candidates), the backend forwards to **RECEIVER ONLY** because:

1. **Point-to-Point**: WebRTC negotiation is between two peers
2. **No Echo**: Sender doesn't need their own signal back
3. **Efficiency**: Reduces unnecessary message traffic

---

## Backend Verification Checklist

✅ **Call Initiate:**
- Checks busy state before allowing call
- Marks both users as busy
- Sends to both users

✅ **Call Accept:**
- Updates call history with start time
- Sends to both users

✅ **Call Reject:**
- Frees busy state
- Updates call history
- Sends to both users

✅ **Call End:**
- Frees busy state
- Records who ended the call
- Sends to both users

✅ **Call Not Answered:**
- Frees busy state
- Marks as not answered
- Sends to both users

✅ **WebRTC Signals:**
- Forwards to receiver only
- Supports offer, answer, ice-candidate

✅ **Disconnect Handling:**
- Detects user disconnect
- Frees busy state
- Notifies other user

---

## Summary

The backend code is **well-structured and correct**. It properly:
- Manages busy state with Redis
- Handles all call lifecycle events
- Forwards WebRTC signals
- Cleans up on disconnect
- Sends appropriate signals to appropriate users

The frontend has been updated to:
- Ignore self-initiated call-requests
- Only create offers when in 'calling' state
- Handle all backend signals appropriately
- Manage state transitions correctly

The integration is now complete and should work correctly!
