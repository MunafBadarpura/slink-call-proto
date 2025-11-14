-- Cleanup Stuck Calls
-- Run this SQL when you get "Call already in progress" error

-- Option 1: End all ongoing calls (safest for testing)
UPDATE call_history 
SET call_end_time = NOW(),
    is_not_answered = true
WHERE call_end_time IS NULL;

-- Option 2: Delete all incomplete call records (more aggressive)
-- DELETE FROM call_history WHERE call_end_time IS NULL;

-- Option 3: End specific call by ID (if you know the call_history_id)
-- UPDATE call_history 
-- SET call_end_time = NOW(),
--     is_not_answered = true
-- WHERE call_history_id = 89;

-- Verify cleanup
SELECT 
    call_history_id,
    sender_id,
    receiver_id,
    picked_up,
    is_rejected,
    is_not_answered,
    call_initiated_time,
    call_start_time,
    call_end_time,
    call_type
FROM call_history 
WHERE call_end_time IS NULL;

-- Should return 0 rows after cleanup

-- Also clear Redis busy users (if you have Redis CLI access)
-- redis-cli
-- KEYS busy:*
-- DEL busy:1 busy:2
-- KEYS session:*
-- DEL session:01zksvm4 session:p03owmgw
