# Quick Fix: "Sender Not Found" Error

## The Problem
Your call feature is failing with "Sender Not Found" because users with IDs 1-5 don't exist in your database.

## Quick Solution (Choose One)

### Option A: Create Test Users in Database (Recommended for Testing)

1. **Open your database client** (MySQL Workbench, pgAdmin, DBeaver, etc.)

2. **Run this SQL:**
   ```sql
   INSERT INTO user_master (user_id, name, email, password, status, is_online, created_at) 
   VALUES 
     (1, 'Alice Johnson', 'alice@example.com', 'password', 'ACTIVE', false, NOW()),
     (2, 'Bob Smith', 'bob@example.com', 'password', 'ACTIVE', false, NOW()),
     (3, 'Charlie Brown', 'charlie@example.com', 'password', 'ACTIVE', false, NOW()),
     (4, 'Diana Prince', 'diana@example.com', 'password', 'ACTIVE', false, NOW()),
     (5, 'Ethan Hunt', 'ethan@example.com', 'password', 'ACTIVE', false, NOW());
   ```

3. **Verify:**
   ```sql
   SELECT user_id, name, status FROM user_master WHERE user_id IN (1,2,3,4,5);
   ```

4. **Refresh your web app** and try calling again

### Option B: Use Existing Users

1. **Find existing user IDs:**
   ```sql
   SELECT user_id, name FROM user_master WHERE status = 'ACTIVE' LIMIT 5;
   ```

2. **Update `web/src/config/users.js`** with the real IDs:
   ```javascript
   export const AVAILABLE_USERS = [
     { id: 101, name: 'Real User 1' },  // Replace with actual IDs
     { id: 102, name: 'Real User 2' },
     // ... etc
   ];
   ```

3. **Refresh your web app**

## Verify It Works

1. Open two browser windows (or use incognito mode for second window)
2. Window 1: Login as User 1
3. Window 2: Login as User 2
4. Window 1: Click the phone icon next to User 2
5. Window 2: Should receive incoming call notification

## Still Having Issues?

Check:
- ✅ Users exist in database with correct IDs
- ✅ User status is 'ACTIVE' (not 'INACTIVE' or 'DELETED')
- ✅ Backend is running on port 8008
- ✅ WebSocket URL in `CallContext.js` matches your backend
- ✅ No firewall blocking WebSocket connections

## Files Modified
- `web/src/config/users.js` - User configuration (centralized)
- `web/src/screens/LoginScreen.js` - Now imports from config
- `web/src/screens/UserSelectionScreen.js` - Now imports from config

## Next Steps After Fix
Once calls are working, consider:
1. Implementing real user authentication
2. Fetching users from API instead of hardcoding
3. Adding user search functionality
4. Implementing user avatars/profile pictures
