# Backend Changes for Browser Close Detection

## 1. Add User Registration Handler to HannanCallController

Add this method to your `HannanCallController` to register users when they connect:

```java
// Add this field at the top of HannanCallController
public static final Map<String, String> sessionUserMap = new ConcurrentHashMap<>();

// Add this method
@MessageMapping("/user/register")
public void registerUser(@Payload Map<String, Object> data, SimpMessageHeaderAccessor headerAccessor) {
    String userId = (String) data.get("userId");
    String sessionId = headerAccessor.getSessionId();
    
    if (userId != null && sessionId != null) {
        sessionUserMap.put(sessionId, userId);
        System.out.println("User registered: " + userId + " with session: " + sessionId);
    }
}
```

## 2. Add REST Endpoint for Browser Close

Add this REST controller to handle calls when users close their browser:

```java
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/call")
@CrossOrigin(origins = "*")
public class CallRestController {

    @Autowired
    private HannanCallController callController;

    @PostMapping("/{callerId}/{receiverId}/end")
    public void endCallViaRest(@PathVariable String callerId,
                               @PathVariable String receiverId,
                               @RequestBody(required = false) Map<String, Object> data) {
        
        System.out.println("=== REST CALL END (Browser Close) ===");
        System.out.println("Caller ID: " + callerId);
        System.out.println("Receiver ID: " + receiverId);

        // Reuse existing endCall logic
        callController.endCall(callerId, receiverId, data != null ? data : new HashMap<>());
    }
}
```

## 3. Update WebSocket Event Listener

Update your disconnect listener to use the sessionUserMap from HannanCallController:

```java
@EventListener
public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
    StompHeaderAccessor sha = StompHeaderAccessor.wrap(event.getMessage());
    String sessionId = sha.getSessionId();
    
    // Get userId from HannanCallController's sessionUserMap
    String userId = (sessionId != null) ? HannanCallController.sessionUserMap.remove(sessionId) : null;

    if (userId != null) {
        System.out.println("=== USER DISCONNECTED ===");
        System.out.println("User ID: " + userId);
        System.out.println("Session ID: " + sessionId);

        // 1️⃣ Broadcast that this user is offline
        messagingTemplate.convertAndSend("/topic/presence", userId + " is OFFLINE");

        // 2️⃣ Update user DB status (only if numeric ID)
        try {
            Long userIdLong = Long.parseLong(userId);
            masterDao.getUserMasterDao().findById(userIdLong).ifPresent(user -> {
                user.setIsOnline(false);
                user.setLastOnlineAt(LocalDateTime.now());
                masterDao.getUserMasterDao().save(user);
            });
        } catch (NumberFormatException e) {
            System.out.println("String-based userId, skipping DB update");
        }

        // 3️⃣ Handle call cleanup if user was on call
        if (HannanCallController.busyUsers.containsKey(userId)) {
            String otherUserId = HannanCallController.busyUsers.get(userId);

            // Remove both users from busy map
            HannanCallController.busyUsers.remove(userId);
            HannanCallController.busyUsers.remove(otherUserId);

            System.out.println("User disconnected during call: " + userId + " <-> " + otherUserId);

            // Notify the other user that call ended unexpectedly
            Map<String, Object> response = new HashMap<>();
            response.put("signalType", "call-end");
            response.put("signalData", Map.of("disconnectedUser", userId));
            response.put("timestamp", new java.util.Date().toString());

            messagingTemplate.convertAndSend("/topic/call/" + otherUserId, response);
        }
    }
}
```

## Key Features

1. **REST Endpoint**: Handles `sendBeacon` calls when browser closes
2. **WebSocket Disconnect**: Automatically ends calls when WebSocket disconnects
3. **Busy Status Cleanup**: Removes users from busy list on disconnect
4. **Notification**: Notifies the other user that the call ended

## Testing

1. Start a call between User A and User B
2. Close User B's browser tab
3. User A should see "Call ended" immediately
4. Both users should be removed from busy status

## Notes

- `sendBeacon` is used because it's reliable during page unload
- WebSocket disconnect is also monitored as a backup
- The system handles both graceful and ungraceful disconnections
