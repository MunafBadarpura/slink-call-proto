# Fix: User Disconnect Detection During Calls

## Problem
When User B closes browser during a call with User A, User A still shows User B is on the call.

## Solution

### Frontend Change (Already Applied ✅)
Added `userId` to WebSocket connection headers in `CallContext.js`:

```javascript
connectHeaders: {
  userId: currentUserId
}
```

### Backend Change (Add This)

Add a `SessionConnectEvent` handler to capture the userId when users connect:

```java
@EventListener
public void handleWebSocketConnectListener(SessionConnectEvent event) {
    StompHeaderAccessor sha = StompHeaderAccessor.wrap(event.getMessage());
    String sessionId = sha.getSessionId();
    String userIdStr = sha.getFirstNativeHeader("userId");
    
    if (userIdStr != null && sessionId != null) {
        try {
            Long userId = Long.parseLong(userIdStr);
            sessionUserMap.put(sessionId, userId);
            System.out.println("User connected: " + userId + " Session: " + sessionId);
        } catch (NumberFormatException e) {
            System.err.println("Invalid userId format: " + userIdStr);
        }
    }
}
```

**Important:** Add this import at the top of your `WebSocketEventListener`:
```java
import org.springframework.web.socket.messaging.SessionConnectEvent;
```

## How It Works

1. **User Connects**: Frontend sends `userId` in WebSocket headers
2. **Backend Captures**: `SessionConnectEvent` stores `sessionId → userId` mapping
3. **User Disconnects**: Backend looks up userId from sessionId
4. **Call Cleanup**: If user was in a call, backend:
   - Removes both users from `busyUsers` map
   - Sends `call-end` signal to the other user
5. **User A Notified**: User A's call ends immediately

## Testing

1. Start call between User A (user1) and User B (user2)
2. Close User B's browser tab
3. User A should see "Call ended" within 1-2 seconds
4. Both users removed from busy status
5. User A can make new calls immediately

## What You Already Have ✅

- ✅ Frontend sends userId in headers
- ✅ Backend `SessionDisconnectEvent` handler with call cleanup logic
- ✅ Busy users map cleanup
- ✅ Call-end notification to other user

## What You Need to Add

- ⚠️ `SessionConnectEvent` handler to capture userId on connect
- ⚠️ Import statement for `SessionConnectEvent`

That's it! Just add the connect event handler and the disconnect detection will work perfectly.
