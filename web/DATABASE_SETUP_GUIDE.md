# Database Setup Guide for Call Feature

## Problem
The backend is throwing "Sender Not Found" error because the user IDs in the frontend don't exist in your database.

## Error Details
```
=== WEBSOCKET EXCEPTION ===
Exception: Sender Not Found
```

This happens because the backend validates users:
```java
UserMaster sender = masterDao.getUserMasterDao().findByIdAndStatus(senderId, Status.ACTIVE)
    .orElseThrow(() -> new ResourceNotFoundException("Sender Not Found"));
```

## Solution: Create Test Users in Database

### Option 1: Use SQL to Create Test Users

Run this SQL in your database to create 5 test users:

```sql
-- Insert test users (adjust based on your UserMaster table structure)
INSERT INTO user_master (user_id, name, email, password, status, is_online, created_at) 
VALUES 
  (1, 'Alice Johnson', 'alice@example.com', 'password123', 'ACTIVE', false, NOW()),
  (2, 'Bob Smith', 'bob@example.com', 'password123', 'ACTIVE', false, NOW()),
  (3, 'Charlie Brown', 'charlie@example.com', 'password123', 'ACTIVE', false, NOW()),
  (4, 'Diana Prince', 'diana@example.com', 'password123', 'ACTIVE', false, NOW()),
  (5, 'Ethan Hunt', 'ethan@example.com', 'password123', 'ACTIVE', false, NOW());
```

**Note:** Adjust the column names and values based on your actual `user_master` table structure.

### Option 2: Use Existing Users

If you already have users in your database:

1. **Check existing users:**
   ```sql
   SELECT user_id, name, email FROM user_master WHERE status = 'ACTIVE' LIMIT 10;
   ```

2. **Update the frontend configuration:**
   - Open `web/src/config/users.js`
   - Replace the user IDs with actual IDs from your database:
   
   ```javascript
   export const AVAILABLE_USERS = [
     { id: 101, name: 'John Doe' },      // Use real user_id from database
     { id: 102, name: 'Jane Smith' },    // Use real user_id from database
     { id: 103, name: 'Mike Johnson' },  // Use real user_id from database
     { id: 104, name: 'Sarah Wilson' },  // Use real user_id from database
     { id: 105, name: 'Tom Brown' }      // Use real user_id from database
   ];
   ```

## Verify Your UserMaster Table Structure

Check your table structure to ensure you're using the correct column names:

```sql
DESCRIBE user_master;
-- or
SHOW COLUMNS FROM user_master;
```

Common variations:
- `user_id` vs `userId` vs `id`
- `name` vs `user_name` vs `full_name`
- `status` vs `user_status`
- `is_online` vs `isOnline` vs `online_status`

## Required Fields for Call Feature

Your `user_master` table should have at least:
- `user_id` (Long/BIGINT) - Primary key
- `name` or `user_name` (String/VARCHAR) - User's display name
- `status` (String/VARCHAR) - Should be 'ACTIVE' for active users
- `is_online` (Boolean/TINYINT) - Tracks online status

## Testing After Setup

1. **Verify users exist:**
   ```sql
   SELECT user_id, name, status, is_online FROM user_master WHERE user_id IN (1, 2, 3, 4, 5);
   ```

2. **Restart your Spring Boot application** (if needed)

3. **Refresh the web application** and try logging in with User 1

4. **Try calling User 2** - it should now work without "Sender Not Found" error

## Troubleshooting

### Error: "Sender Not Found"
- User with that ID doesn't exist in database
- User status is not 'ACTIVE'
- Check the user_id in the database matches the ID in `users.js`

### Error: "Receiver Not Found"
- Same as above, but for the user you're trying to call

### Error: "Call already in progress"
- There's an existing call record in `call_history` table
- Clear old records:
  ```sql
  DELETE FROM call_history WHERE call_end_time IS NULL;
  ```

## Production Considerations

For production, you should:
1. Implement a proper user registration/authentication system
2. Fetch available users from an API endpoint instead of hardcoding
3. Add proper user search functionality
4. Implement user presence/availability status
5. Add user profile pictures/avatars

## Example API Integration (Future Enhancement)

Instead of hardcoded users, fetch from backend:

```javascript
// In UserSelectionScreen.js
useEffect(() => {
  fetch('/api/users/active')
    .then(res => res.json())
    .then(users => setAvailableUsers(users));
}, []);
```

Backend endpoint:
```java
@GetMapping("/api/users/active")
public List<UserDTO> getActiveUsers() {
    return userService.findAllActiveUsers();
}
```
