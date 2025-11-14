# Troubleshooting Guide

## Common Issues and Solutions

### 1. "Call already in progress" (CONFLICT 409)

**Symptom:**
```
callHistory: {status: 'CONFLICT', statusCode: 409, message: 'Call already in progress'}
```

**Cause:** There's an incomplete call record in the database from a previous call that wasn't properly ended.

**Solution:**
Run this SQL to clean up stuck calls:
```sql
UPDATE call_history 
SET call_end_time = NOW(),
    is_not_answered = true
WHERE call_end_time IS NULL;
```

Or use the provided script:
```bash
# Run in your database client
mysql -u your_user -p your_database < cleanup_stuck_calls.sql
```

**Prevention:** The frontend now handles this automatically by showing an alert and cleaning up the UI state.

---

### 2. WebSocket Keeps Disconnecting

**Symptom:**
```
✅ WebSocket Connected successfully
❌ WebSocket Disconnected (immediately after)
```

**Causes:**
1. React Strict Mode creating duplicate connections
2. Browser tab going to sleep
3. Network issues
4. Backend STOMP broker relay issues

**Solutions:**

**A. React Strict Mode (Development Only)**
- This is normal in development mode
- React Strict Mode intentionally double-mounts components
- The code now handles this by checking for existing connections
- In production build, this won't happen

**B. Backend STOMP Broker**
Check your backend logs for:
```
TCP connection failure in session: failed to forward DISCONNECT
reactor.netty.channel.AbortedException
```

If you see this, your STOMP broker relay might be misconfigured. Check `WebSocketConfig.java`:
```java
@Override
public void configureMessageBroker(MessageBrokerRegistry config) {
    config.enableSimpleBroker("/topic");  // Use simple broker for testing
    config.setApplicationDestinationPrefixes("/app");
}
```

**C. Network/Firewall**
- Ensure port 8008 is not blocked
- Check if WebSocket connections are allowed
- Try disabling VPN/proxy temporarily

---

### 3. "Sender Not Found" or "Receiver Not Found"

**Symptom:**
```
=== WEBSOCKET EXCEPTION ===
Exception: Sender Not Found
```

**Solution:** See `DATABASE_SETUP_GUIDE.md` or `QUICK_FIX.md`

Quick fix:
```sql
INSERT INTO user_master (user_id, name, email, password, status, is_online, created_at) 
VALUES 
  (1, 'User 1', 'user1@example.com', 'password', 'ACTIVE', false, NOW()),
  (2, 'User 2', 'user2@example.com', 'password', 'ACTIVE', false, NOW());
```

---

### 4. Multiple WebSocket Connections

**Symptom:**
```
=== 🎉 WEBSOCKET CONNECTED SUCCESSFUL 🎉 ===
Session ID: 01zksvm4
=== 🎉 WEBSOCKET CONNECTED SUCCESSFUL 🎉 ===
Session ID: zifj4djl  (duplicate for same user)
```

**Cause:** React Strict Mode or multiple browser tabs

**Solutions:**
1. **React Strict Mode:** Normal in development, fixed in code
2. **Multiple Tabs:** Each tab creates its own connection (expected behavior)
3. **Backend Cleanup:** The backend now removes old sessions when a new one connects

---

### 5. Call Timeout Not Working

**Symptom:** Call stays in "calling" or "incoming" state forever

**Solution:** The timeout is set to 30 seconds. If it's not working:
1. Check browser console for errors
2. Ensure `callTimeoutTimer` is being set
3. Verify `handleCallTimeout` is being called

To test:
```javascript
// In CallContext.js, temporarily reduce timeout
callTimeoutTimer.current = setTimeout(() => {
  handleCallTimeout();
}, 5000); // 5 seconds for testing
```

---

### 6. No Incoming Call Notification

**Symptom:** User 1 calls User 2, but User 2 doesn't see incoming call

**Checklist:**
- ✅ Both users are logged in
- ✅ Both WebSocket connections are active
- ✅ User IDs exist in database
- ✅ No "Call already in progress" error
- ✅ Backend shows "CALL INITIATE" log
- ✅ Check browser console on User 2's side for incoming message

**Debug:**
Open browser console on User 2's side and look for:
```
Incoming message: {"signalType": "call-request", ...}
```

If you don't see this, check:
1. Backend logs for errors
2. WebSocket subscription: `/topic/call/2`
3. Network tab for WebSocket frames

---

### 7. Audio Not Working

**Symptom:** Call connects but no audio

**Solutions:**
1. **Check Microphone Permission:**
   - Browser should show microphone icon in address bar
   - Click and ensure "Allow" is selected

2. **Check Audio Elements:**
   ```javascript
   // In browser console
   document.querySelector('audio').srcObject
   // Should show MediaStream object
   ```

3. **Check WebRTC Connection:**
   ```javascript
   // In browser console during call
   // Should show "connected"
   ```

4. **Test Microphone:**
   - Go to chrome://settings/content/microphone
   - Ensure your site is allowed

---

### 8. Video Call Not Working

**Symptom:** Video call initiated but no video

**Solutions:**
1. Check camera permission (same as microphone)
2. Verify video elements exist:
   ```javascript
   document.querySelector('.local-video')
   document.querySelector('.remote-video')
   ```
3. Check if video tracks are enabled:
   ```javascript
   localStream.getVideoTracks()[0].enabled // Should be true
   ```

---

## Quick Diagnostic Commands

### Check Database State
```sql
-- Check users
SELECT user_id, name, status, is_online FROM user_master WHERE user_id IN (1, 2);

-- Check ongoing calls
SELECT * FROM call_history WHERE call_end_time IS NULL;

-- Check recent calls
SELECT * FROM call_history ORDER BY call_initiated_time DESC LIMIT 5;
```

### Check Redis State (if using Redis)
```bash
redis-cli
KEYS busy:*
KEYS session:*
GET busy:1
GET session:01zksvm4
```

### Check Backend Logs
Look for:
- `=== 🎉 WEBSOCKET CONNECTED SUCCESSFUL 🎉 ===`
- `=== CALL INITIATE ===`
- `=== WEBSOCKET EXCEPTION ===`
- `=== ❌ WEBSOCKET DISCONNECTED ❌ ===`

### Check Browser Console
Look for:
- `✅ WebSocket Connected successfully`
- `✅ Subscribed to /topic/call/X`
- `Publishing call initiate...`
- `Incoming message:`

---

## Still Having Issues?

1. **Clear everything and start fresh:**
   ```sql
   -- Database
   UPDATE call_history SET call_end_time = NOW() WHERE call_end_time IS NULL;
   UPDATE user_master SET is_online = false;
   
   -- Redis (if using)
   redis-cli FLUSHDB
   ```

2. **Restart backend server**

3. **Hard refresh browser** (Ctrl+Shift+R or Cmd+Shift+R)

4. **Check versions:**
   - Node.js: v14+ recommended
   - Spring Boot: 2.7+ or 3.x
   - Browser: Chrome/Edge/Firefox latest

5. **Enable verbose logging:**
   In `CallContext.js`, all console.log statements are already in place.
   In backend, ensure DEBUG level logging is enabled.

---

## Production Checklist

Before deploying to production:
- [ ] Remove console.log statements (or use proper logging)
- [ ] Use HTTPS for WebSocket (wss://)
- [ ] Implement proper authentication
- [ ] Add rate limiting for call initiation
- [ ] Set up monitoring for WebSocket connections
- [ ] Configure proper CORS settings
- [ ] Use environment variables for URLs
- [ ] Implement proper error tracking (Sentry, etc.)
- [ ] Add call quality metrics
- [ ] Implement reconnection logic with exponential backoff
- [ ] Add user presence indicators
- [ ] Implement call history UI
- [ ] Add notification sounds/vibrations
- [ ] Test on mobile browsers
- [ ] Test with poor network conditions
- [ ] Load test with multiple concurrent calls
