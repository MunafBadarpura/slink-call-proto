# Complete Call Flow Documentation

## Overview
This document describes the complete end-to-end call flow including normal scenarios and edge cases.

---

## 1. Normal Call Flow (Successful)

### Step 1: User 1 Initiates Call

**Frontend (User 1):**
```javascript
initiateCall(2, "User 2", false)
  → Sets state to 'calling'
  → Sets remoteUserId to 2
  → Sets up local audio stream
  → Sends call-initiate message
```

**Backend:**
```java
@MessageMapping("/call/{callerId}/{receiverId}/initiate")
  → Validates users exist
  → Checks if users are busy
  → Creates CallHistory record
  → Sends call-request to both users
```

**Frontend (User 2):**
```javascript
Receives call-request
  → handleIncomingCall()
  → Sets state to 'incoming'
  → Sets remoteUserId to 1
  → Plays ringtone
  → Shows incoming call screen
```

### Step 2: User 2 Accepts Call

**Frontend (User 2):**
```javascript
acceptCall()
  → Stops ringtone
  → Sets state to 'connected'
  → Sets up local audio stream
  → Sends call-accept message
  → Waits for offer...
```

**Backend:**
```java
@MessageMapping("/call/{callerId}/{receiverId}/accept")
  → Updates CallHistory (pickedUp = true)
  → Marks both users as busy in Redis
  → Sends call-accept to both users
```

**Frontend (User 1):**
```javascript
Receives call-accept
  → handleCallAccepted()
  → Checks: callState === 'calling' ✅
  → Sets state to 'connected'
  → Creates WebRTC offer
  → Sends offer to User 2
```

**Frontend (User 2):**
```javascript
Receives call-accept (broadcast)
  → handleCallAccepted()
  → Checks: callState === 'calling' ❌
  → Ignores signal (already connected)
```

### Step 3: WebRTC Negotiation

**Frontend (User 1):**
```javascript
createOffer()
  → setupPeerConnection()
  → Creates SDP offer
  → sendSignal('offer', {offer})
  → Destination: /app/call/1/2
```

**Backend:**
```java
@MessageMapping("/call/{senderId}/{receiverId}")
  → Forwards offer to User 2
  → Destination: /topic/call/2
```

**Frontend (User 2):**
```javascript
Receives offer
  → handleOffer()
  → setupPeerConnection() (NOW creates it)
  → setRemoteDescription(offer)
  → Creates SDP answer
  → sendSignal('answer', {answer})
  → Destination: /app/call/2/1
```

**Backend:**
```java
@MessageMapping("/call/{senderId}/{receiverId}")
  → Forwards answer to User 1
  → Destination: /topic/call/1
```

**Frontend (User 1):**
```javascript
Receives answer
  → handleAnswer()
  → setRemoteDescription(answer)
```

### Step 4: ICE Candidate Exchange

**Both Users:**
```javascript
onicecandidate event fires
  → sendSignal('ice-candidate', {candidate})
  → Backend forwards to other user
  → handleIceCandidate()
  → addIceCandidate(candidate)
```

### Step 5: Connection Established

**Both Users:**
```javascript
ICE connection state: checking → connected
  → Audio streams flowing
  → Call timer running
  → In-call screen displayed
```

### Step 6: User Ends Call

**Frontend (Either User):**
```javascript
endCall()
  → Sends call-end message with endedById
```

**Backend:**
```java
@MessageMapping("/call/{callerId}/{receiverId}/end")
  → Updates CallHistory (callEndTime, endedBy)
  → Frees both users from busy state
  → Sends call-end to both users
```

**Frontend (Both Users):**
```javascript
Receives call-end
  → handleCallEnded()
  → Cleans up peer connection
  → Stops media streams
  → Sets state to 'idle'
```

---

## 2. Call Rejected Flow

### User 2 Rejects Call

**Frontend (User 2):**
```javascript
rejectCall()
  → Stops ringtone
  → Sends call-reject message
```

**Backend:**
```java
@MessageMapping("/call/{callerId}/{receiverId}/reject")
  → Updates CallHistory (isRejected = true)
  → Frees both users from busy state
  → Sends call-reject to both users
```

**Frontend (Both Users):**
```javascript
Receives call-reject
  → handleCallRejected()
  → Cleans up
  → Sets state to 'idle'
```

---

## 3. Call Not Answered Flow

### Timeout After 30 Seconds

**Frontend (Either User):**
```javascript
After 30 seconds in 'calling' or 'incoming' state:
  → handleCallTimeout()
  → Sends call-notAnswered message
```

**Backend:**
```java
@MessageMapping("/call/{callerId}/{receiverId}/notAnswered")
  → Updates CallHistory (isNotAnswered = true)
  → Frees both users from busy state
  → Sends call-not-answered to both users
```

**Frontend (Both Users):**
```javascript
Receives call-not-answered
  → handleCallNotAnswered()
  → Cleans up
  → Sets state to 'idle'
```

---

## 4. User Busy Flow

### User Already on Another Call

**Frontend (User 1):**
```javascript
initiateCall(2, "User 2", false)
  → Sends call-initiate message
```

**Back