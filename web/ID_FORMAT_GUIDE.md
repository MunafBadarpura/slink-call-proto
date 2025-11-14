# User ID Format Guide

## Important: All IDs Must Be Numeric

The backend expects all user IDs as **Long (numeric)** values. Sending string IDs will cause a `NumberFormatException`.

## Current Implementation

### Mock Users (LoginScreen & UserSelectionScreen)
```javascript
const AVAILABLE_USERS = [
  { id: 1, name: 'Alice Johnson' },
  { id: 2, name: 'Bob Smith' },
  { id: 3, name: 'Charlie Brown' },
  { id: 4, name: 'Diana Prince' },
  { id: 5, name: 'Ethan Hunt' }
];
```

### CallContext Auto-Conversion
The CallContext automatically converts string IDs to numbers:
```javascript
const userId = typeof currentUserId === 'string' ? parseInt(currentUserId, 10) : currentUserId;
```

## Backend Requirements

### WebSocket Connect Headers
```java
String userIdHeader = sha.getFirstNativeHeader("userId");
Long userId = Long.parseLong(userIdHeader);  // Expects numeric string like "1", "2", etc.
```

### All API Endpoints
All endpoints expect Long values:
- `/app/call/{callerId}/{receiverId}/initiate`
- `/app/call/{callerId}/{receiverId}/accept`
- `/app/call/{callerId}/{receiverId}/reject`
- `/app/call/{callerId}/{receiverId}/end`
- `/app/call/{callerId}/{receiverId}/notAnswered`

## What NOT to Do

❌ **Don't use string IDs:**
```javascript
const USERS = [
  { id: 'user1', name: 'Alice' },  // WRONG!
  { id: 'alice', name: 'Alice' },  // WRONG!
];
```

✅ **Use numeric IDs:**
```javascript
const USERS = [
  { id: 1, name: 'Alice' },  // CORRECT!
  { id: 2, name: 'Bob' },    // CORRECT!
];
```

## Integration with Real Backend

When integrating with a real user database:

1. Ensure your User table has a numeric ID (Long/BigInt)
2. Pass the numeric ID to CallProvider:
   ```javascript
   <CallProvider currentUserId={user.id}>  // user.id should be a number
   ```
3. The CallContext will handle the conversion automatically

## Error Example

If you send a string ID like "user1", you'll see:
```
java.lang.NumberFormatException: For input string: "user1"
    at java.base/java.lang.Long.parseLong(Long.java:709)
```

## Solution

Always use numeric IDs (1, 2, 3, etc.) in your frontend code.
