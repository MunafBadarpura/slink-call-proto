# Call Logic Update Summary

## Overview
Updated the frontend call logic (both React Native and Web) to match the new backend API structure with proper DTOs, callHistoryId tracking, enhanced signal handling, and numeric ID support.

## Critical Fix: Numeric IDs
**Issue:** Backend expects all user IDs as Long (numeric) values, but frontend was sending string IDs like "user1", "user2", causing `NumberFormatException`.

**Solution:** 
- Changed all user IDs from strings to numbers (1, 2, 3, etc.)
- Added automatic conversion in CallContext to handle both string and numeric IDs
- Updated LoginScreen and UserSelectionScreen to use numeric IDs

## Key Changes Made

### 1. Added New State Variables
- `callHistoryId`: Tracks the call history record ID from backend
- `callType`: Stores call type as 'AUDIO' or 'VIDEO' (matching backend enum)
- `callTimeoutTimer`: Handles call timeout for not-answered scenarios

### 2. Updated WebSocket Connection
- Added `userId` in `connectHeaders` for proper user identification on backend
- Backend now tracks user sessions with Redis for better state management

### 3. Updated Request Payloads

#### Call Initiate Request
**Old:**
```javascript
{
  callerId: currentUserId,
  callerName: currentUserId,
  receiverId: receiverId,
  isVideoCall: videoCall
}
```

**New (matches CallInitiateRequest DTO):**
```javascript
{
  callType: 'AUDIO' | 'VIDEO',
  signalData: {
    callerId: currentUserId,
    callerName: receiverName,
    receiverId: receiverId
  }
}
```

#### Call Accept Request
**Old:**
```javascript
{
  callerId: remoteUserId,
  receiverId: currentUserId
}
```

**New (matches CallAcceptRequest DTO):**
```javascript
{
  callHistoryId: callHistoryId,
  signalData: {
    callerId: remoteUserId,
    receiverId: currentUserId
  }
}
```

#### Call Reject Request
**New (matches CallRejectRequest DTO):**
```javascript
{
  callHistoryId: callHistoryId,
  signalData: {
    callerId: remoteUserId,
    receiverId: currentUserId
  }
}
```

#### Call End Request
**New (matches CallEndRequest DTO):**
```javascript
{
  callHistoryId: callHistoryId,
  endedById: currentUserId,
  signalData: {
    callerId: currentUserId,
    receiverId: remoteUserId
  }
}
```

#### Call Not Answered Request
**New (matches CallNotAnsweredRequest DTO):**
```javascript
{
  callHistoryId: callHistoryId,
  signalData: {}
}
```

### 4. Enhanced Signal Handling

#### New Signal Types
- `call-busy`: Handles when user is already on another call
- `call-not-answered`: Handles when call times out without answer

#### Call History Integration
- Backend now returns `callHistory` object in `call-request` signal
- Frontend extracts `callHistoryId` from response and uses it in subsequent requests
- Properly maps sender/receiver information from CallHistoryDTO

### 5. Call Timeout Implementation
- 30-second timeout for unanswered calls (both incoming and outgoing)
- Automatically sends `notAnswered` signal to backend
- Cleans up resources and resets state
- Timeout is cleared when call is accepted, rejected, or ended

### 6. Improved State Management
- Added `clearCallTimeout()` helper function
- Properly cleans up `callHistoryId` and `callType` on call end
- Better handling of call state transitions

## Backend Integration Points

### CallSocketController Endpoints
1. `/app/call/{callerId}/{receiverId}/initiate` - Initiates call
2. `/app/call/{callerId}/{receiverId}/accept` - Accepts call
3. `/app/call/{callerId}/{receiverId}/reject` - Rejects call
4. `/app/call/{callerId}/{receiverId}/end` - Ends call
5. `/app/call/{callerId}/{receiverId}/notAnswered` - Marks call as not answered

### Response Structure
Backend sends responses with:
- `signalType`: Type of signal (call-request, call-accept, etc.)
- `signalData`: Signal-specific data
- `callHistory`: Call history record (for call-request)
- `timestamp`: ISO timestamp

### CallHistoryDTO Fields Used
- `callHistoryId`: Unique identifier for the call
- `senderId`: ID of call initiator
- `senderName`: Name of call initiator
- `receiverId`: ID of call receiver
- `callType`: 'AUDIO' or 'VIDEO'

## Files Updated

### React Native (src/)
- `src/context/CallContext.js`

### Web (web/src/)
- `web/src/context/CallContext.js` - Updated to use numeric IDs and match backend API
- `web/src/screens/LoginScreen.js` - Changed user IDs from strings to numbers
- `web/src/screens/UserSelectionScreen.js` - Changed user IDs from strings to numbers

## Testing Recommendations

1. **Call Initiation**: Test both audio and video call initiation
2. **Call Accept**: Verify callHistoryId is properly sent
3. **Call Reject**: Ensure proper cleanup and backend notification
4. **Call End**: Test ending from both caller and receiver side
5. **Call Timeout**: Wait 30 seconds without answering to test timeout
6. **Busy State**: Try calling a user already on a call
7. **Connection Loss**: Test behavior when WebSocket disconnects during call
8. **Call History**: Verify backend properly records all call states

## Notes

- Both React Native and Web implementations now use the same API structure
- Call timeout is set to 30 seconds (configurable)
- Backend uses Redis for tracking busy users (replaced in-memory map)
- WebSocket event listener handles cleanup on disconnect
- All request payloads now match backend DTO structure exactly
- **All IDs must be numeric (Long) values** - the backend will throw NumberFormatException if string IDs are sent
- CallContext automatically converts string IDs to numbers for compatibility
- User IDs in mock data changed from "user1", "user2" to 1, 2, 3, etc.
